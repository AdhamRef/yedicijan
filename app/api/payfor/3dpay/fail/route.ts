import { hasBankVerifiedFinancialSettlement } from "@/lib/payfor-bank-settlement";
import { NextRequest, NextResponse } from "next/server";
import { publicOrigin } from "@/lib/public-origin";
import { prisma } from "@/lib/prisma";
import { dispatchEvent } from "@/lib/events/dispatch";
import { sendDonationFailedConversions } from "@/lib/tracking/donation-conversion-server";
import { payForAmountMatches, verifyPayForResponseHash } from "@/lib/payfor";

export async function POST(req: NextRequest) {
  const origin = publicOrigin(req);
  const { searchParams } = new URL(req.url);
  const donationId = searchParams.get("donationId") || "";
  const requestedLocale = searchParams.get("locale") || "en";
  const locale = ["ar", "en", "fr", "tr", "id", "pt", "es", "de"].includes(requestedLocale)
    ? requestedLocale
    : "en";
  const destination = new URL(
    "/" + locale + "/donation-failed?donationId=" + encodeURIComponent(donationId),
    origin
  );
  if (!donationId) return NextResponse.redirect(destination);

  const form = await req.formData();
  const raw: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value !== "string" || Object.prototype.hasOwnProperty.call(raw, key)) {
      return NextResponse.redirect(destination);
    }
    raw[key] = value;
  }

  // An arbitrary POST to FailUrl must NEVER mark a pending donation FAILED.
  if (
    raw.OrderId !== donationId ||
    !verifyPayForResponseHash(raw, {
      merchantId: process.env.PAYFOR_MERCHANT_ID,
      merchantPass: process.env.PAYFOR_MERCHANT_PASS,
      userCode: process.env.PAYFOR_USER_CODE,
    })
  ) {
    console.warn("[PayFor FAIL] Unverified callback ignored", { donationId });
    return NextResponse.redirect(destination);
  }

  // No signed amount/currency proof yet: do not mark FAILED or emit events.
  if (!hasBankVerifiedFinancialSettlement(null)) {
    console.warn("[PayFor FAIL] Awaiting verified bank reconciliation", { donationId });
    return NextResponse.redirect(destination);
  }

  // Only an explicit, signed bank refusal is eligible to change the state.
  if (raw.ProcReturnCode === "00") return NextResponse.redirect(destination);

  try {
    const donation = await prisma.donation.findUnique({ where: { id: donationId } });
    const snapshot = (
      donation?.providerRaw as {
        payforRequest?: { orderId?: string; purchAmount?: string; currency?: string };
      } | null
    )?.payforRequest;

    if (!snapshot) return NextResponse.redirect(destination);

    if (
      donation?.status === "FAILED" ||
      Boolean(donation?.paidAt) ||
      donation.provider !== "PAYFOR" ||
      donation.providerOrderId !== raw.OrderId ||
      snapshot?.orderId !== raw.OrderId ||
      snapshot?.currency !== "949" ||
      raw.Currency !== snapshot.currency ||
      !payForAmountMatches(raw.PurchAmount, snapshot.purchAmount)
    ) return NextResponse.redirect(destination);

    const written = await prisma.donation.updateMany({
      where: {
        id: donationId,
        paidAt: null,
        provider: "PAYFOR",
        providerOrderId: raw.OrderId,
      },
      data: {
        status: "FAILED",
        providerProcReturnCode: raw.ProcReturnCode,
        providerTxnResult: raw.TxnResult || null,
        providerErrorMessage: "Verified payment refusal",
        providerRaw: {
          payforRequest: snapshot,
          payforVerifiedResponse: {
            orderId: raw.OrderId,
            procReturnCode: raw.ProcReturnCode,
            threeDStatus: raw["3DStatus"] || "",
          },
        },
      },
    });
    if (written.count === 1) {
      void dispatchEvent("DONATION_FAILED", { donationId });
      void sendDonationFailedConversions(donationId);
    }
  } catch (error) {
    console.error("[PayFor FAIL] Callback processing failed", {
      donationId,
      error: error instanceof Error ? error.name : "unknown",
    });
  }
  return NextResponse.redirect(destination);
}
