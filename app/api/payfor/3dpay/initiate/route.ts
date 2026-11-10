import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { mayInitiateForActor, mayStartPayForAttempt } from "@/lib/payfor-guest-intent";

/**
 * SAFE HOLD: QNB PayFor 3DPay's legacy browser form includes merchant UserPass
 * and saved-card PAN. Until the bank approves a hosted/tokenized or other
 * credential-free browser integration, this handler MUST NOT issue a session.
 * It still validates authorization + settlement state before returning HOLD.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const data = await request.json().catch(() => null) as {
      donationId?: unknown;
      paymentIntentToken?: unknown;
      savedCardId?: unknown;
    } | null;
    if (!data || typeof data.donationId !== "string" ||
        !/^[a-f0-9]{24}$/i.test(data.donationId)) {
      return NextResponse.json({ error: "Valid donationId required" }, { status: 400 });
    }

    const donation = await prisma.donation.findUnique({
      where: { id: data.donationId },
      select: {
        id: true, donorId: true, createdAt: true, totalAmount: true, currency: true,
        status: true, paidAt: true, provider: true, providerOrderId: true,
        providerRaw: true, subscriptionId: true,
      },
    });
    // Do not disclose donor data, even if a valid ObjectId was guessed.
    if (!donation || !mayInitiateForActor(
      donation, session?.user?.id, data.paymentIntentToken
    )) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (data.savedCardId != null) {
      return NextResponse.json({
        error: "Stored cards are disabled until bank tokenization is approved.",
      }, { status: 403 });
    }

    if (!mayStartPayForAttempt(donation)) {
      return NextResponse.json({
        error: "Payment settled or another attempt exists; reconcile before retry.",
      }, { status: 409 });
    }

    // Never include UserPass, decrypted PAN, merchant secrets or card tokens
    // in JSON, HTML, form fields or redirects. This safe hold has NO writes.
    return NextResponse.json({
      error: "PayFor is unavailable until a bank-approved secure flow is enabled.",
      code: "PAYFOR_SECURE_INTEGRATION_REQUIRED",
    }, { status: 503 });
  } catch {
    return NextResponse.json({ error: "Payment initiation unavailable" }, { status: 503 });
  }
}
