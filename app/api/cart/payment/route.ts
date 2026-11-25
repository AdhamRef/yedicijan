import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isValidLocale } from "@/lib/locales";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { resolveReferralId } from "@/lib/referral-server";
import { userHasDashboardPermission } from "@/lib/dashboard/permissions";
import { donationListSafeFields } from "@/lib/dashboard/donation-list-privacy";
import { inferLocaleFromRequest } from "@/lib/preferred-lang";
import { sanitizeDonationAttribution } from "@/lib/attribution/sanitize";
import { getTrackingClientIp } from "@/lib/tracking/client-ip";
import { writeAuditLog, auditStreamForRole } from "@/lib/audit-log";
import {
  convertAmountInCurrencyToUsd,
  normalizeDonationCurrencyCode,
} from "@/lib/exchange/convert-amount-in-currency-to-usd";
import {
  countryCodeFromPhone,
  getDonorCountryCodeForSnapshot,
  normalizeDonorCountryCode,
} from "@/lib/donations/donor-country-code";
import { resolveGuestDonor } from "@/lib/users/resolve-guest-donor";
import { completionData } from "@/lib/users/account-claim";
import { mintDonationAccessToken } from "@/lib/donations/access-token";

/** Card is the only way to pay: Albaraka (lira) or PayFor (every other currency). */
const PAYMENT_METHODS = new Set(["CARD"]);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");
    const userId = searchParams.get("userId");
    const requestedPage = Number.parseInt(searchParams.get("page") || "1", 10);
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 10;
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
      && Number.isSafeInteger((requestedPage - 1) * limit) ? requestedPage : 1;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      ...(userId && { donorId: userId }),
      ...(!userHasDashboardPermission(session.user, "revenue") && {
        donorId: session.user.id,
      }),
      ...(campaignId && { items: { some: { campaignId } } }),
    };

    // Get total count for pagination
    const total = await prisma.donation.count({ where });

    // Get donations with pagination
    const donations = await prisma.donation.findMany({
      where,
      // This GET is callable by donors: do not fetch receipt access tokens,
      // card details, raw PSP records or bank reconciliation state.
      omit: {
        accessToken: true, cardDetails: true, providerRaw: true,
        originalDonorId: true, providerAuthCode: true, providerHostRefNum: true,
        paypalOrderId: true, paypalCaptureId: true,
        bankOperations: true, bankOperationLock: true, bankOperationsRevision: true,
        bankLastInquiry: true, reconciliationLeaseToken: true,
        reconciliationLeaseUntil: true, reconciliationNextAt: true,
        reconciliationCheckedAt: true,
      },
      include: {
        donor: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        items: {
          include: {
            campaign: {
              select: {
                title: true,
                images: true,
              },
            },
          },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    return NextResponse.json({
      donations: donations.map(row => donationListSafeFields(row, {
        revenueAuthorized: userHasDashboardPermission(session.user, "revenue"),
      })),
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching donations:", error);
    return NextResponse.json(
      { error: "Failed to fetch donations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const {
      items,
      currency: requestedCurrency,
      teamSupport: teamSupportIn = 0,
      coverFees = false,
      type = "ONE_TIME",
      paymentMethod,
      referralCode,
      locale: donationLocale,
      guest,
    } = body;

    // Validate required fields
    if (!Array.isArray(items) || !items.length || !requestedCurrency || !paymentMethod) {
      return NextResponse.json(
        { error: "Items, currency, and payment method are required" },
        { status: 400 }
      );
    }
    // Every donation is one-time; monthly/recurring plans were removed on purpose.
    if (type !== "ONE_TIME") {
      return NextResponse.json({ error: "Only one-time donations are supported." }, { status: 400 });
    }
    if (!PAYMENT_METHODS.has(String(paymentMethod))) {
      return NextResponse.json({ error: "Unsupported payment method" }, { status: 400 });
    }
    const lineOk = (line: { amount?: unknown; campaignId?: unknown }) =>
      typeof line?.amount === "number" && Number.isFinite(line.amount) && line.amount > 0 &&
      typeof line?.campaignId === "string";
    if (!(items as Array<{ amount?: unknown; campaignId?: unknown }>).every(lineOk)) {
      return NextResponse.json({ error: "Every line needs a positive amount" }, { status: 400 });
    }

    /* Where the donor came from (UTM, click ids, landing page) as the browser
       recorded it, whitelisted the same way as `POST /api/donations`. The
       dashboard's source column and the ad conversion events read it. */
    const clientIp = getTrackingClientIp(request.headers);
    const userAgent = request.headers.get("user-agent")?.slice(0, 500) || undefined;
    const donationAttribution = sanitizeDonationAttribution({
      ...(body.attribution && typeof body.attribution === "object" && !Array.isArray(body.attribution)
        ? (body.attribution as Record<string, unknown>)
        : {}),
      user_agent: userAgent,
      client_ip: clientIp,
      client_ip_address: undefined,
    }) as Prisma.InputJsonValue | undefined;

    /* "Support the team" belongs to the order. The amount is the browser's
       choice but the switch is the admin's: with the step turned off nothing is
       added whatever the request says. */
    const teamSupportSettings = await prisma.globalSettings.findFirst({
      orderBy: { createdAt: "asc" },
      select: { teamSupportEnabled: true },
    });
    const teamSupportAllowed = teamSupportSettings?.teamSupportEnabled !== false;
    const teamSupport =
      teamSupportAllowed && typeof teamSupportIn === "number" && Number.isFinite(teamSupportIn) && teamSupportIn > 0
        ? Math.round(teamSupportIn * 100) / 100
        : 0;

    // Resolve donor
    let donorId: string;
    let donorName: string | null = null;

    if (session?.user?.id) {
      donorId = session.user.id;
      donorName = session.user.name ?? null;
      /* The form also carries what a signed-in donor typed. It completes their
         own record (a phone or a surname missing) and never replaces a field
         already filled. The account's email is theirs and is not touched. */
      if (guest) {
        const me = await prisma.user.findUnique({
          where: { id: donorId },
          select: { name: true, phone: true, countryCode: true, verifiedAt: true },
        });
        if (me) {
          const typedName = [guest.firstName, guest.lastName].filter(Boolean).join(" ").trim();
          const typedPhone = typeof guest.phone === "string" && guest.phone.replace(/\D/g, "").length >= 7 ? guest.phone : null;
          const data = completionData(me, {
            name: typedName || null,
            phone: typedPhone,
            countryCode: normalizeDonorCountryCode(guest.countryCode) ?? countryCodeFromPhone(typedPhone ?? undefined) ?? null,
          });
          if (Object.keys(data).length) await prisma.user.update({ where: { id: donorId }, data });
          donorName = donorName ?? (me.name || typedName || null);
        }
      }
    } else if (guest) {
      const guestPhone = guest.phone || undefined;
      const guestCountry =
        normalizeDonorCountryCode(guest.countryCode) ?? countryCodeFromPhone(guestPhone) ?? undefined;
      const resolved = await resolveGuestDonor(
        prisma,
        {
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
          phone: guest.phone,
          countryCode: guestCountry ?? null,
          city: guest.city ?? null,
          region: guest.region ?? null,
        },
        { preferredLang: inferLocaleFromRequest(request, donationLocale) ?? null }
      );
      donorId = resolved.donorId;
      donorName = resolved.donorName;
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const donorCountrySnapshot =
      session?.user?.id
        ? (await getDonorCountryCodeForSnapshot(prisma, donorId)) ?? undefined
        : normalizeDonorCountryCode(guest?.countryCode) ??
          countryCodeFromPhone(guest?.phone) ??
          ((await getDonorCountryCodeForSnapshot(prisma, donorId)) ?? undefined);

    // Card payments are handled via the bank 3D Secure redirect flows (we do not store PAN/CVV).

    // Calculate totals
    const totalAmount = (items as { amount: number }[]).reduce(
      (sum: number, item: { amount: number }) => sum + item.amount,
      0
    );
    const fees = (totalAmount + teamSupport) * 0.03;
    const finalTotalAmount = totalAmount + teamSupport + (coverFees ? fees : 0);

    // Stored on the donation normalised: `DEFAULT` (no currency chosen) is USD, and a
    // stored `DEFAULT` broke the card gateways that convert it later.
    const currencyNorm = normalizeDonationCurrencyCode(requestedCurrency);
    let donationTotalUsd: number;
    try {
      donationTotalUsd = await convertAmountInCurrencyToUsd(finalTotalAmount, currencyNorm);
    } catch (e) {
      console.error("[cart/payment] convert total to USD:", e);
      return NextResponse.json(
        { error: "Exchange rate unavailable. Please try again in a moment." },
        { status: 503 }
      );
    }

    type CartItemIn = {
      campaignId: string;
      amount: number;
      amountUSD?: number;
      shareCount?: number;
    };

    let itemsResolved: Array<{
      campaignId: string;
      amount: number;
      amountUSD: number;
      shareCount?: number;
    }>;

    try {
      itemsResolved = await Promise.all(
        (items as CartItemIn[]).map(async (item) => ({
          campaignId: item.campaignId,
          amount: item.amount,
          amountUSD: await convertAmountInCurrencyToUsd(item.amount, currencyNorm),
          ...(item.shareCount != null && item.shareCount > 0
            ? { shareCount: Math.floor(item.shareCount) }
            : {}),
        }))
      );
    } catch (e) {
      console.error("[cart/payment] convert lines to USD:", e);
      return NextResponse.json(
        { error: "Exchange rate unavailable. Please try again in a moment." },
        { status: 503 }
      );
    }

    // Verify all campaigns exist and are active
    const campaignIds = [...new Set((items as { campaignId: string }[]).map((item) => item.campaignId))];
    const campaigns = await prisma.campaign.findMany({
      where: { id: { in: campaignIds } },
    });

    if (campaigns.length !== campaignIds.length) {
      return NextResponse.json(
        { error: "One or more campaigns not found" },
        { status: 404 }
      );
    }

    if (campaigns.some((campaign) => !campaign.isActive)) {
      return NextResponse.json(
        { error: "One or more campaigns are not active" },
        { status: 400 }
      );
    }

    const referralId = await resolveReferralId(referralCode);

    const validLocale =
      donationLocale && isValidLocale(String(donationLocale).toLowerCase())
        ? String(donationLocale).toLowerCase()
        : null;

    const donation = await prisma.$transaction(async (tx) => {
      const d = await tx.donation.create({
        data: {
          accessToken: mintDonationAccessToken(),
          amount: totalAmount,
          amountUSD: donationTotalUsd,
          teamSupport,
          coverFees,
          currency: currencyNorm,
          fees: coverFees ? fees : 0,
          totalAmount: finalTotalAmount,
          /* PAID with no paidAt is the "pending confirmation" state: only the
             gateway callback stamps paidAt. Nothing counts anywhere before. */
          status: "PAID",
          locale: validLocale ?? undefined,
          donorCountryCode: donorCountrySnapshot,
          donorId: donorId,
          referralId: referralId ?? undefined,
          paymentMethod,
          cardDetails: null,
          ...(donationAttribution ? { attribution: donationAttribution } : {}),
          items: {
            create: itemsResolved.map((item) => ({
              campaignId: item.campaignId,
              amount: item.amount,
              amountUSD: item.amountUSD,
              ...(item.shareCount != null && item.shareCount > 0
                ? { shareCount: item.shareCount }
                : {}),
            })),
          },
        },
        include: {
          donor: { select: { name: true, email: true } },
          items: { include: { campaign: { select: { title: true } } } },
        },
      });

      if (validLocale) {
        const donor = await tx.user.findUnique({
          where: { id: donorId },
          select: { preferredLang: true },
        });
        if (donor && donor.preferredLang == null) {
          await tx.user.update({
            where: { id: donorId },
            data: { preferredLang: validLocale },
          });
        }
      }

      return d;
    }, { timeout: 15000 });

    const actorRole = session?.user?.role ?? "DONOR";
    await writeAuditLog({
      actorId: donorId,
      actorName: donorName,
      actorRole,
      action: "DONATION_ONE_TIME_CHECKOUT_START",
      messageAr: `${donorName ?? "متبرع"} بدأ عملية دفع تبرعًا لمرة واحدة عبر السلة (≈ ${donationTotalUsd.toFixed(0)} USD)`,
      entityType: "Donation",
      entityId: donation.id,
      metadata: { amountUSD: donationTotalUsd, via: "cart_payment", status: "PENDING" },
      stream: auditStreamForRole(actorRole),
    });

    // The response carries the donation's guest access token (`?t=`): the checkout
    // needs it to poll the donation and to open the success page as a guest.
    return NextResponse.json({
      success: true,
      donation,
    });
  } catch (error) {
    console.error("Error creating donation:", error);
    return NextResponse.json(
      { error: "Failed to create donation" },
      { status: 500 }
    );
  }
}
