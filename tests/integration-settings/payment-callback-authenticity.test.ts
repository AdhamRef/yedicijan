import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { payForHash, verifyPayForRequestEcho } from "../../lib/payfor";

const PASS = "merchant-pass-fixture";
const ID = "6af674e2d1cd34cbb9de7d1a";
const echo = (over: Record<string, string> = {}) => {
  const f = { MbrId: "5", OrderId: ID, PurchAmount: "250.00", OkUrl: `https://www.yedicihan.org/api/payfor/3dpay/ok?donationId=${ID}&locale=ar`,
    FailUrl: `https://www.yedicihan.org/api/payfor/3dpay/fail?donationId=${ID}&locale=ar`, TxnType: "Auth", InstallmentCount: "0", Rnd: "1763460000000", ProcReturnCode: "V034", ...over };
  const Hash = payForHash({ mbrId: f.MbrId, orderId: f.OrderId, purchAmount: f.PurchAmount, okUrl: f.OkUrl, failUrl: f.FailUrl, txnType: f.TxnType, installmentCount: f.InstallmentCount, rnd: f.Rnd, merchantPass: PASS });
  return { ...f, Hash };
};

test("a 3D-stage failure echoing our own signed request is recognised as genuine", () => {
  assert.equal(verifyPayForRequestEcho(echo(), PASS), true);
});

test("a forged or altered echo is not: other order, other amount, no hash, wrong or missing password", () => {
  const g = echo();
  assert.equal(verifyPayForRequestEcho({ ...g, OrderId: "6af674e2d1cd34cbb9de7d1b" }, PASS), false, "replayed against another donation");
  assert.equal(verifyPayForRequestEcho({ ...g, PurchAmount: "1.00" }, PASS), false, "amount changed");
  const { Hash: _h, ...unsigned } = g; void _h;
  assert.equal(verifyPayForRequestEcho(unsigned, PASS), false, "no hash");
  assert.equal(verifyPayForRequestEcho(g, "wrong"), false);
  assert.equal(verifyPayForRequestEcho(g, undefined), false);
});

const read = (p: string) => fs.readFileSync(p, "utf8");
// Yedicihan: Minber's separate approval-only ResponseHash rule predates #253 and is not part of this port.
test("OK callback: genuineness is checked before ANY status change", () => {
  const s = read("app/api/payfor/3dpay/ok/route.ts");
  const gate = s.indexOf("if (!genuine) {"), firstFailed = s.indexOf('status: "FAILED"'), firstPaid = s.indexOf('status: "PAID"');
  assert.ok(gate > 0 && gate < firstFailed, "the gate precedes every FAILED write");
  assert.ok(gate < firstPaid, "the gate precedes the PAID write");
  assert.match(s, /orderId === donation\.id \|\| \(!!donation\.providerOrderId && orderId === donation\.providerOrderId\)/);
});

test("FAIL callback: only a genuine callback marks FAILED and messages the donor", () => {
  const s = read("app/api/payfor/3dpay/fail/route.ts");
  assert.match(s, /if \(donation && genuine && donation\.paidAt === null\) \{/);
  assert.ok(s.indexOf("const genuine") < s.indexOf('dispatchEvent("DONATION_FAILED"'));
});

// Yedicihan has no separate donation access tokens: the donation id is the guest's access,
// a signed-in user must own the donation, staff may act on any.
test("browser-reported failure: access is checked before the donation is touched", () => {
  const r = read("app/api/donations/[id]/fail/route.ts");
  const gate = r.indexOf("await authorizeDonationAccess(id)");
  assert.ok(gate > 0 && gate < r.indexOf("prisma.donation.findUnique"));
  const a = read("lib/donations/donation-access.ts");
  assert.ok(a.includes("if (!session) return { allowed: true };"));
  assert.ok(a.includes("return { allowed: staff || session.user.id === row.donorId };"));
});
