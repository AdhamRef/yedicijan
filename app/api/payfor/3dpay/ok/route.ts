import { NextRequest, NextResponse } from "next/server";
import { publicOrigin } from "@/lib/public-origin";
import { prisma } from "@/lib/prisma";
import { dispatchDonationPaid } from "@/lib/events/dispatch";
import { payForAmountMatches, verifyPayForResponseHash } from "@/lib/payfor";

const safeLocale = (locale: string | null) =>
  ["ar", "en", "fr", "tr", "id", "pt", "es", "de"].includes(locale || "")
    ? locale!
    : "en";

export async function POST(req: NextRequest) {
  const origin = publicOrigin(req);
  const { searchParams } = new URL(req.url);
  const donationId = searchParams.get("donationId") || "";
  const locale = safeLocale(searchParams.get("locale"));
  const failUrl = new URL(
    "/" + locale + "/donation-failed?donationId=" + encodeURIComponent(donationId),
    origin
  );
  if (!donationId) return NextResponse.redirect(failUrl);

  // Accept scalar bank values only; reject ambiguous duplicated inputs.
  const form = await req.formData();
  const raw: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value !== "string" || Object.prototype.hasOwnProperty.call(raw, key)) {
      return NextResponse.redirect(failUrl);
    }
    raw[key] = value;
  }

  // A return to this URL alone is not proof of settlement.
  const signed = verifyPayForResponseHash(raw, {
    merchantId: process.env.PAYFOR_MERCHANT_ID,
    merchantPass: process.env.PAYFOR_MERCHANT_PASS,
    userCode: process.env.PAYFOR_USER_CODE,
  });
  if (!signed || raw.OrderId !== donationId) {
    console.warn("[PayFor OK] Unverified callback ignored", { donationId });
    return NextResponse.redirect(failUrl);
  }

  const orderId = raw.OrderId;
  const procReturnCode = raw.ProcReturnCode;
  const threeDStatus = raw["3DStatus"];
  const authCode = raw.AuthCode || "";
  const hostRefNum = raw.HostRefNum || "";

  try {
    const result = await prisma.$transaction(async (tx) => {
      const donation = await tx.donation.findUnique({
        where: { id: donationId },
        include: { items: true, categoryItems: true },
      });
      if (!donation) return "not_found" as const;

      // A repeated verified callback must not re-credit revenue.
      if (donation.status === "PAID" && donation.paidAt) return "already_paid" as const;

      const snapshot = (
        donation.providerRaw as {
          payforRequest?: { orderId?: string; purchAmount?: string; currency?: string };
        } | null
      )?.payforRequest;

      if (!snapshot) return "unverified" as const;

      const linked =
        donation.status !== "FAILED" &&
        !donation.paidAt &&
        donation.provider === "PAYFOR" &&
        donation.providerOrderId === orderId &&
        snapshot?.orderId === orderId &&
        snapshot?.currency === "949" &&
        raw.Currency === snapshot.currency &&
        payForAmountMatches(raw.PurchAmount, snapshot.purchAmount);

      if (!linked) return "unverified" as const;
      if (procReturnCode !== "00" || threeDStatus !== "1" || !authCode) {
        return "not_approved" as const;
      }

      // Atomic compare-and-set also protects the project increment.
      const written = await tx.donation.updateMany({
        where: {
          id: donation.id,
          paidAt: null,
          provider: "PAYFOR",
          providerOrderId: orderId,
        },
        data: {
          status: "PAID",
          paidAt: new Date(),
          providerProcReturnCode: procReturnCode,
          providerTxnResult: raw.TxnResult || null,
          providerAuthCode: authCode,
          providerHostRefNum: hostRefNum || null,
          providerErrorMessage: null,
          // Raw bank fields may contain card details; keep only approved fields.
          providerRaw: {
            payforRequest: snapshot,
            payforVerifiedResponse: { orderId, procReturnCode, threeDStatus, hostRefNum },
          },
        },
      });
      if (written.count !== 1) return "duplicate_or_changed" as const;

      for (const item of donation.items) {
        await tx.campaign.update({
          where: { id: item.campaignId },
          data: { currentAmount: { increment: item.amountUSD ?? item.amount } },
        });
      }
      for (const item of donation.categoryItems) {
        await tx.category.update({
          where: { id: item.categoryId },
          data: { currentAmount: { increment: item.amountUSD ?? item.amount } },
        });
      }
      return "newly_paid" as const;
    });

    if (result === "newly_paid") void dispatchDonationPaid(donationId);
    if (result === "newly_paid" || result === "already_paid") {
      return NextResponse.redirect(new URL("/" + locale + "/success/" + donationId, origin));
    }
    console.warn("[PayFor OK] Callback held for reconciliation", { donationId, reason: result });
  } catch (error) {
    console.error("[PayFor OK] Settlement transaction failed", {
      donationId,
      error: error instanceof Error ? error.name : "unknown",
    });
  }
  return NextResponse.redirect(failUrl);
}
