import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidLocale } from "@/lib/locales";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { resolveReferralId } from "@/lib/referral-server";
import { userHasDashboardPermission } from "@/lib/dashboard/permissions";
import { inferLocaleFromRequest } from "@/lib/preferred-lang";
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
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
      donations,
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
  // Emergency switch (/dashboard/security): while donations are paused, no new payment starts.
  // Lazy and fail-open: a problem reading the switch never stops a donation.
  const paused = await import("@/lib/site-security/emergency").then((m) => m.emergencyResponse(request)).catch(() => null);
  if (paused) return paused;
  try {
    const session = await getServerSession(authOptions);

    const body = await request.json();
    const {
      items,
      currency,
      teamSupport = 0,
      coverFees = false,
      type = "ONE_TIME",
      paymentMethod,
      referralCode,
      locale: donationLocale,
      guest,
    } = body;

    // Validate required fields
    if (!items?.length || !currency || !paymentMethod) {
      return NextResponse.json(
        { error: "Items, currency, and payment method are required" },
        { status: 400 }
      );
    }
    if (type !== "ONE_TIME") {
      return NextResponse.json({ error: "Only one-time donations are supported." }, { status: 400 });
    }

    // Donation guard (observe-only in this release). Loaded lazily and fail-open, so a guard
    // problem can never stop a donation or affect payment processing.
    const donationGuard = await import("@/lib/site-security/donation-guard")
      .then((m) => m.checkDonationGuard(request, { paymentMethod: String(paymentMethod), userId: session?.user?.id ?? null, email: session?.user?.email ?? guest?.email, phone: guest?.phone, deviceId: (body.attribution as Record<string, unknown> | undefined)?.session_id }))
      .catch(() => ({ response: null, keys: null }));
    if (donationGuard.response) return donationGuard.response;

    // Resolve donor
    let donorId: string;
    let donorName: string | null = null;

    if (session?.user?.id) {
      donorId = session.user.id;
      donorName = session.user.name ?? null;
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

    // Card payments are handled via PayFor 3D Secure redirect flow (we do not store PAN/CVV).

    // Calculate totals
    const totalAmount = (items as { amount: number }[]).reduce(
      (sum: number, item: { amount: number }) => sum + item.amount,
      0
    );
    const fees = (totalAmount + teamSupport) * 0.03;
    const finalTotalAmount = totalAmount + teamSupport + (coverFees ? fees : 0);

    const currencyNorm = normalizeDonationCurrencyCode(currency);
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
      campaignId?: string;
      categoryId?: string;
      amount: number;
      amountUSD?: number;
      shareCount?: number;
    };
    // A cart holds project lines and category lines (zakat for a country through the
    // country's category). Each kind is saved the way a single donation already saves it.
    const OBJECT_ID = /^[a-f\d]{24}$/i;
    const lines = items as CartItemIn[];
    const isProject = (l: CartItemIn) => typeof l.campaignId === "string" && OBJECT_ID.test(l.campaignId);
    const isCategory = (l: CartItemIn) => typeof l.categoryId === "string" && OBJECT_ID.test(l.categoryId);
    // Exactly one target per line (a line with neither would be paid for but saved nowhere).
    if (lines.some((l) => !(Number(l.amount) > 0) || isProject(l) === isCategory(l))) {
      return NextResponse.json({ error: "Each cart line needs an amount and exactly one of campaignId or categoryId" }, { status: 400 });
    }
    const projectLines = lines.filter(isProject);
    const categoryLines = lines.filter(isCategory);
    // What the lines are for (e.g. "زكاة المال — فلسطين · الغذاء"), kept on the donation so the
    // team sees the chosen countries and fields; a category alone records only the country.
    const lineNotes = (lines as Array<CartItemIn & { label?: unknown }>)
      .map((l) => (typeof l.label === "string" ? l.label.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 140) : ""))
      .filter(Boolean);

    let itemsResolved: Array<{
      campaignId: string;
      amount: number;
      amountUSD: number;
      shareCount?: number;
    }>;
    let categoryItemsResolved: Array<{ categoryId: string; amount: number; amountUSD: number }>;

    try {
      categoryItemsResolved = await Promise.all(
        categoryLines.map(async (item) => ({
          categoryId: item.categoryId!,
          amount: item.amount,
          amountUSD: await convertAmountInCurrencyToUsd(item.amount, currencyNorm),
        }))
      );
      itemsResolved = await Promise.all(
        projectLines.map(async (item) => ({
          campaignId: item.campaignId!,
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

    // Verify all categories exist and are active
    if (categoryLines.length) {
      const catIds = [...new Set(categoryLines.map((l) => l.categoryId!))];
      const cats = await prisma.category.findMany({ where: { id: { in: catIds } }, select: { id: true, isActive: true } });
      if (cats.length !== catIds.length) {
        return NextResponse.json({ error: "One or more categories not found" }, { status: 404 });
      }
      if (cats.some((c: { isActive: boolean | null }) => c.isActive === false)) {
        return NextResponse.json({ error: "One or more categories are not active" }, { status: 400 });
      }
    }

    // Verify all campaigns exist and are active
    const campaignIds = [...new Set(projectLines.map((item) => item.campaignId!))];
    const campaigns = campaignIds.length
      ? await prisma.campaign.findMany({
          where: { id: { in: campaignIds } },
        })
      : [];

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
          amount: totalAmount,
          amountUSD: donationTotalUsd,
          teamSupport,
          coverFees,
          currency,
          fees: coverFees ? fees : 0,
          totalAmount: finalTotalAmount,
          status: "PAID",
          locale: validLocale ?? undefined,
          donorCountryCode: donorCountrySnapshot,
          donorId: donorId,
          referralId: referralId ?? undefined,
          paymentMethod,
          cardDetails: null,
          ...(lineNotes.length ? { comment: lineNotes.join(" | ").slice(0, 1000) } : {}),
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
          ...(categoryItemsResolved.length
            ? { categoryItems: { create: categoryItemsResolved } }
            : {}),
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
      metadata: { amountUSD: donationTotalUsd, via: "cart_payment", status: "PENDING", provider: "PAYFOR" },
      stream: auditStreamForRole(actorRole),
    });

    void import("@/lib/site-security/donation-guard").then((m) => m.recordDonationGuardAttempt(donationGuard, [donation.id])).catch(() => undefined);
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
