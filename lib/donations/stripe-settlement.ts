import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { donationFieldEmpty } from "@/lib/donations/mongo-null";

type StoredPayment = {
  id: string;
  donorId: string;
  provider: string | null;
  providerOrderId: string | null;
  status: string;
  paidAt: Date | null;
  totalAmount: number;
  currency: string;
  subscriptionId: string | null;
};

export type StripeProof = {
  kind: "intent" | "checkout";
  reference: string;
  donationId: string;
  donorId: string;
  status: string;
  currency: string;
  amountSmallestUnit: number;
  paidSmallestUnit: number;
  intentId: string;
};

/** No floating point tolerance and no implicit multi-currency conversion. */
export function stripePaymentMatches(d: StoredPayment, proof: StripeProof): boolean {
  const currency = String(d.currency).trim().toLowerCase();
  const amount = Number(d.totalAmount);
  if (!Number.isFinite(amount) || amount <= 0 ||
      !Number.isSafeInteger(Math.round(amount * 100)) ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001) return false;
  if (d.subscriptionId) return false; // Monthly invoice settlement requires separate proof.
  return proof.status === "succeeded" &&
    proof.donationId === d.id &&
    proof.donorId === d.donorId &&
    proof.currency.toLowerCase() === currency &&
    proof.amountSmallestUnit === Math.round(amount * 100) &&
    proof.paidSmallestUnit === Math.round(amount * 100) &&
    proof.intentId.startsWith("pi_") &&
    proof.reference === d.providerOrderId &&
    d.provider === "STRIPE" &&
    d.status !== "FAILED" &&
    d.paidAt == null;
}

export function proofFromPaymentIntent(intent: Stripe.PaymentIntent): StripeProof | null {
  if (intent.status !== "succeeded" || !intent.metadata?.donationId ||
      !intent.metadata?.userId || !Number.isSafeInteger(intent.amount) ||
      !Number.isSafeInteger(intent.amount_received)) return null;
  return {
    kind: "intent", reference: intent.id, intentId: intent.id,
    donationId: intent.metadata.donationId,
    donorId: intent.metadata.userId,
    status: intent.status, currency: intent.currency,
    amountSmallestUnit: intent.amount, paidSmallestUnit: intent.amount_received,
  };
}

export function proofFromCheckoutSession(session: Stripe.Checkout.Session): StripeProof | null {
  const paymentIntent = typeof session.payment_intent === "string"
    ? session.payment_intent : session.payment_intent?.id;
  if (session.mode !== "payment" || session.payment_status !== "paid" ||
      !session.metadata?.donationId || !session.metadata?.userId ||
      !session.currency || !paymentIntent ||
      !Number.isSafeInteger(session.amount_total)) return null;
  return {
    kind: "checkout", reference: session.id, intentId: paymentIntent,
    donationId: session.metadata.donationId, donorId: session.metadata.userId,
    status: "succeeded", currency: session.currency,
    amountSmallestUnit: session.amount_total!, paidSmallestUnit: session.amount_total!,
  };
}

/**
 * Called exclusively AFTER webhook signature verification. No GET or browser
 * request can reach this service. Unlinked or conflicting money stays pending.
 * A conditional update inside a MongoDB transaction prevents parallel credits.
 */
export async function settleVerifiedStripeDonation(proof: StripeProof): Promise<"paid" | "skipped"> {
  if (!/^[a-f\d]{24}$/i.test(proof.donationId)) return "skipped";
  return prisma.$transaction(async tx => {
    const donation = await tx.donation.findUnique({
      where: { id: proof.donationId },
      include: { items: true, categoryItems: true },
    });
    if (!donation || !stripePaymentMatches(donation, proof)) return "skipped";
    const updated = await tx.donation.updateMany({
      where: {
        id: donation.id,
        donorId: donation.donorId,
        provider: "STRIPE",
        providerOrderId: proof.reference,
        status: "PAID",
        AND: [donationFieldEmpty("paidAt")],
      },
      data: {
        status: "PAID", paidAt: new Date(),
        providerAuthCode: proof.intentId,
        providerTxnResult: "Success",
        providerRaw: {
          verifiedStripe: {
            kind: proof.kind, reference: proof.reference,
            intentId: proof.intentId, amount: proof.paidSmallestUnit,
            currency: proof.currency.toLowerCase(),
          },
        },
      },
    });
    if (updated.count !== 1) return "skipped";
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
    return "paid";
  }, { maxWait: 10_000, timeout: 20_000 });
}
