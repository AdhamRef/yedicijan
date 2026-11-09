import { redactPayForResponse } from "@/lib/payfor";
import { recordSignedPayForDecline } from "@/lib/site-security/payfor-verified-decline";
import { verifyPayForResponseHash } from "@/lib/payfor";
import { NextRequest, NextResponse } from "next/server";
import { publicOrigin } from "@/lib/public-origin";
import { prisma } from "@/lib/prisma";
import { dispatchEvent } from "@/lib/events/dispatch";
import { sendDonationFailedConversions } from "@/lib/tracking/donation-conversion-server";

export async function POST(req: NextRequest) {
  const origin = publicOrigin(req);
  const { searchParams } = new URL(req.url);
  const donationId = searchParams.get("donationId") || "";
  const locale = (searchParams.get("locale") || "en").toLowerCase();

  if (!donationId) {
    return NextResponse.redirect(new URL(`/${locale}/donation-failed`, origin));
  }

  const form = await req.formData();
  const raw = Object.fromEntries(form.entries());

  console.error("[PayFor FAIL] Bank response:", JSON.stringify(redactPayForResponse(raw), null, 2));

  const orderId = String(raw.OrderId || raw.orderId || "");
  const procReturnCode = String(raw.ProcReturnCode || raw.procReturnCode || "");
  const txnResult = String(raw.TxnResult || raw.txnResult || "");
  const errorMessage = String(raw.ErrMsg || raw.ErrorMessage || raw.errorMessage || "Payment failed");

  try {
    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
    });

    const authenticated =
      donation && donation.providerOrderId && orderId &&
      donation.providerOrderId === orderId &&
      verifyPayForResponseHash(raw, process.env.PAYFOR_MERCHANT_PASS);
    // Unsigned failure/3DS return codes cannot mark a donation FAILED.
    // A signed approval posted to the FAIL URL is still an approval, not a decline.
    const bankConfirmedFailure =
      procReturnCode !== "" && procReturnCode !== "00" &&
      txnResult.toLowerCase() !== "success";
    if (donation && donation.paidAt === null && authenticated && bankConfirmedFailure) {
      await prisma.donation.update({
        where: { id: donationId },
        data: {
          status: "FAILED",
          provider: "PAYFOR",
          providerOrderId: donation.providerOrderId ?? orderId ?? null,
          providerProcReturnCode: procReturnCode || null,
          providerTxnResult: txnResult || null,
          providerErrorMessage: errorMessage || null,
          providerRaw: raw as Record<string, unknown>,
        },
      });
      await recordSignedPayForDecline(raw, donation);
      void dispatchEvent("DONATION_FAILED", { donationId });
      // Seed Meta with the failed attempt so lookalike audiences can include
      // donors-who-tried. Browser pixel fires the matching DonateFailed hit
      // with event_id `${donationId}_failed` — same id here for dedup.
      void sendDonationFailedConversions(donationId);
    }
  } catch (e) {
    console.error("[PayFor FAIL] Callback error:", e);
  }

  return NextResponse.redirect(
    new URL(
      `/${locale}/donation-failed?donationId=${encodeURIComponent(donationId)}`,
      origin
    )
  );
}
