import test from "node:test";
import assert from "node:assert/strict";
import { verifiedStripeSubscriptionState, type ProviderSubscriptionSnapshot } from "../../lib/finance/stripe-subscription-authority";

function snapshot(status: ProviderSubscriptionSnapshot["status"], ends: number[] = [1794000000], options: { paused?: boolean; cancel?: boolean } = {}): ProviderSubscriptionSnapshot {
  return {
    id: "sub_test_only",
    status,
    pause_collection: options.paused ? { behavior: "void" } : null,
    cancel_at_period_end: options.cancel ?? false,
    items: { data: ends.map((end) => ({ current_period_end: end })) },
  } as ProviderSubscriptionSnapshot;
}
test("Stripe active subscription is not locally active without an actual successful first charge", () => {
  assert.throws(() => verifiedStripeSubscriptionState(snapshot("active"), false), /NOT_CONFIRMED/);
  assert.equal(verifiedStripeSubscriptionState(snapshot("active"), true).status, "ACTIVE");
});
test("next billing time is taken from Stripe subscription items, not one month from today", () => {
  const expected = new Date(1794000000 * 1000);
  assert.deepEqual(verifiedStripeSubscriptionState(snapshot("active", [1795000000, 1794000000]), true).nextBillingDate, expected);
});
test("pause, cancellation, scheduled cancellation and incomplete Stripe state fail safely", () => {
  assert.deepEqual(verifiedStripeSubscriptionState(snapshot("paused"), true), { status: "PAUSED", nextBillingDate: null });
  assert.deepEqual(verifiedStripeSubscriptionState(snapshot("active", [1794000000], { paused: true }), true), { status: "PAUSED", nextBillingDate: null });
  assert.deepEqual(verifiedStripeSubscriptionState(snapshot("canceled"), false), { status: "CANCELLED", nextBillingDate: null });
  assert.throws(() => verifiedStripeSubscriptionState(snapshot("active", [1794000000], { cancel: true }), true), /CANCELLATION_SCHEDULED/);
  assert.throws(() => verifiedStripeSubscriptionState(snapshot("incomplete"), true), /NOT_CONFIRMED/);
  assert.throws(() => verifiedStripeSubscriptionState(snapshot("active", []), true), /PERIOD_MISSING/);
});
