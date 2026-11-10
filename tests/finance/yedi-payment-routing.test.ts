import assert from "node:assert/strict";
import { test } from "node:test";
// @ts-expect-error Node 24 standalone test runner needs explicit .ts extension.
import { resolveGateway, SUPPORTED_DONATION_CURRENCIES, MONTHLY_DONATIONS_ENABLED } from "../../lib/payment-gateway.ts";
// @ts-expect-error Node 24 standalone test runner needs explicit .ts extension.
import { albarakaTargetCurrency, albarakaCurrencyCode } from "../../lib/albaraka.ts";

const supported = [...SUPPORTED_DONATION_CURRENCIES];
const nonTurkish = supported.filter(c => c !== "TRY");
test("each supported one-time currency: neither PayFor flag nor public ready flag can reroute to disabled provider", () => {
  for (const flag of ["0", "1"]) {
    process.env.NEXT_PUBLIC_PAYFOR_SECURE_FLOW_READY = flag;
    for (const payforEnabled of [false, true]) {
      for (const currency of supported) {
        const gateway = resolveGateway({ currency, payforEnabled });
        assert.equal(gateway, currency === "TRY" ? "ALBARAKA" : "UNAVAILABLE",
          JSON.stringify({ currency, payforEnabled, flag }));
      }
    }
  }
  delete process.env.NEXT_PUBLIC_PAYFOR_SECURE_FLOW_READY;
});
test("unsupported ISO codes cannot be silently treated as Turkish lira", () => {
  for (const currency of ["", "INVALID", "CHF", "JPY", "CAD", "AUD", "UNKNOWN"]) {
    assert.equal(resolveGateway({currency, payforEnabled:true}), "UNAVAILABLE");
    assert.equal(resolveGateway({currency, payforEnabled:false}), "UNAVAILABLE");
  }
  assert.equal(resolveGateway({currency:"tl",payforEnabled:true}), "ALBARAKA");
});
test("Albaraka currency formatter is not proof of merchant foreign-currency approval", () => {
  for (const c of nonTurkish) {
    // A configured TRY terminal may convert, but conversion is not authorization.
    assert.equal(albarakaTargetCurrency(c, "TRY"), "TRY");
  }
  assert.equal(albarakaCurrencyCode("TRY"), "TL");
  assert.equal(albarakaCurrencyCode("USD"), "US");
  assert.equal(albarakaCurrencyCode("EUR"), "EU");
});
test("monthly gateway remains Stripe in routing (separately disabled at checkout by feature gate)", () => {
  for (const currency of supported) {
    assert.equal(resolveGateway({currency,payforEnabled:false,donationType:"MONTHLY"}),"STRIPE");
  }
  assert.equal(typeof MONTHLY_DONATIONS_ENABLED,"boolean");
});
