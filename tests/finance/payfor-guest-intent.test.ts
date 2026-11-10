import assert from "node:assert/strict";
import { test } from "node:test";
import {
  issueGuestPayForIntent, verifyGuestPayForIntent,
  mayInitiateForActor, mayStartPayForAttempt,
// @ts-expect-error Node 24 strip-types requires a .ts suffix in standalone tests.
} from "../../lib/payfor-guest-intent.ts";

process.env.PAYFOR_GUEST_INTENT_SECRET = "synthetic-no-real-credentials-long-enough-123456789";
const now = Date.UTC(2026, 10, 10, 13, 0, 0);
const donation = {
  id: "507f191e810c19729de860ea",
  donorId: "507f1f77bcf86cd799439011",
  createdAt: new Date(now - 1000),
  totalAmount: 57.25,
  currency: "USD",
};
test("guest receives a capability bound to the exact newly created donation", () => {
  const token = issueGuestPayForIntent(donation, now);
  assert.ok(token);
  assert.equal(mayInitiateForActor(donation, null, token, now), true);
  assert.equal(mayInitiateForActor(donation, null, undefined, now), false);
  assert.equal(mayInitiateForActor(donation, null, donation.id, now), false);
  assert.equal(mayInitiateForActor(donation, null, token + "a", now), false);
  assert.equal(mayInitiateForActor({ ...donation, donorId: "507f1f77bcf86cd799439012" }, null, token, now), false);
  assert.equal(mayInitiateForActor({ ...donation, totalAmount: 57.26 }, null, token, now), false);
});
test("only matching authenticated donor can initiate", () => {
  assert.equal(mayInitiateForActor(donation, donation.donorId, null, now), true);
  assert.equal(mayInitiateForActor(donation, "507f1f77bcf86cd799439012", null, now), false);
});
test("guest intent expires and is not transferable across currencies or records", () => {
  const token = issueGuestPayForIntent(donation, now)!;
  assert.equal(verifyGuestPayForIntent(token, donation, now + 20*60*1000 + 1500), false);
  assert.equal(verifyGuestPayForIntent(token, { ...donation, currency: "TRY" }, now), false);
  assert.equal(verifyGuestPayForIntent(token, { ...donation, id: "507f191e810c19729de860eb" }, now), false);
});
test("settled, failed and already initiated donations cannot start another payment", () => {
  const pending = { status: "PAID", paidAt: null, provider: null, providerRaw: null };
  assert.equal(mayStartPayForAttempt(pending), true);
  assert.equal(mayStartPayForAttempt({ ...pending, paidAt: new Date(now) }), false);
  assert.equal(mayStartPayForAttempt({ ...pending, status: "FAILED" }), false);
  assert.equal(mayStartPayForAttempt({ ...pending, provider: "PAYFOR" }), false);
  assert.equal(mayStartPayForAttempt({ ...pending, providerRaw: { payforRequest: {} } }), false);
  assert.equal(mayStartPayForAttempt({ ...pending, providerOrderId: donation.id }), false);
  assert.equal(mayStartPayForAttempt({ ...pending, subscriptionId: donation.id }), false);
});
