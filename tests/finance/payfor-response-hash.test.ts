import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import { verifyPayForResponseHash, payForAmountMatches } from "../../lib/payfor.ts";

const keys = { merchantId: "merchant-test", merchantPass: "private-test", userCode: "user-test" };
const base = {
  OrderId: "donation-test",
  AuthCode: "A12345",
  ProcReturnCode: "00",
  "3DStatus": "1",
  ResponseRnd: "bank-nonce",
  Currency: "949",
  PurchAmount: "150.00",
};
function signed(overrides: Record<string, string> = {}) {
  const r = { ...base, ...overrides };
  const input = [
    keys.merchantId, keys.merchantPass, r.OrderId, r.AuthCode,
    r.ProcReturnCode, r["3DStatus"], r.ResponseRnd, keys.userCode,
  ].join("");
  return { ...r, ResponseHash: crypto.createHash("sha1").update(input).digest("base64") };
}

test("accepts bank response signed using the documented PayFor field order", () => {
  assert.equal(verifyPayForResponseHash(signed(), keys), true);
});
test("rejects unsigned and absent response hashes", () => {
  const response = signed();
  delete (response as Partial<typeof response>).ResponseHash;
  assert.equal(verifyPayForResponseHash(response as Record<string, string>, keys), false);
});
test("rejects spoofed approval, order ID, auth code and nonce", () => {
  for (const key of ["OrderId", "AuthCode", "ProcReturnCode", "3DStatus", "ResponseRnd"] as const) {
    const response = signed();
    response[key] = "malicious";
    assert.equal(verifyPayForResponseHash(response, keys), false, key);
  }
});
test("rejects absent credentials instead of allowing bypass", () => {
  assert.equal(verifyPayForResponseHash(signed(), { ...keys, merchantPass: "" }), false);
});
test("rejects structurally invalid response hashes", () => {
  assert.equal(verifyPayForResponseHash({ ...signed(), ResponseHash: "garbage" }, keys), false);
});
test("requires exact positive amount match to the stored charge", () => {
  assert.equal(payForAmountMatches("150.00", "150"), true);
  for (const value of [undefined, "", "0", "-1", "150.01", "NaN", "Infinity", "150.001"]) {
    assert.equal(payForAmountMatches(value, "150.00"), false, String(value));
  }
});
test("requires a stored expected amount", () => {
  assert.equal(payForAmountMatches("150.00", undefined), false);
});
