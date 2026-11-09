import type Stripe from "stripe";
import type { SubscriptionStatus } from "@prisma/client";

/** Provider-owned subscription state. No local guessed billing dates. */
export type ProviderSubscriptionSnapshot = Pick<Stripe.Subscription, "status" | "pause_collection" | "cancel_at_period_end" | "items" | "id">;

export function verifiedStripeSubscriptionState(
  subscription: ProviderSubscriptionSnapshot,
  hasSettledFirstPayment: boolean,
): { status: SubscriptionStatus; nextBillingDate: Date | null } {
  if (subscription.status === "canceled") return { status: "CANCELLED", nextBillingDate: null };
  if (subscription.status === "paused" || subscription.pause_collection)
    return { status: "PAUSED", nextBillingDate: null };
  if (subscription.status !== "active" || !hasSettledFirstPayment)
    throw new Error("SUBSCRIPTION_NOT_CONFIRMED");
  if (subscription.cancel_at_period_end)
    throw new Error("SUBSCRIPTION_CANCELLATION_SCHEDULED");
  const ends = subscription.items.data.map((item) => item.current_period_end);
  if (!ends.length || ends.some((end) => !Number.isSafeInteger(end) || end <= 0))
    throw new Error("STRIPE_BILLING_PERIOD_MISSING");
  // Multiple items can have different periods; use the earliest renewal date,
  // rather than inventing a monthly date on the server.
  const date = new Date(Math.min(...ends) * 1000);
  if (!Number.isFinite(date.getTime())) throw new Error("STRIPE_BILLING_PERIOD_INVALID");
  return { status: "ACTIVE", nextBillingDate: date };
}
