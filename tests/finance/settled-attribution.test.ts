import test from "node:test";
import assert from "node:assert/strict";
import { summarizeSettledAttribution, settledUsdValue } from "../../lib/marketing/settled-attribution";

const base = {
  paidAt: new Date("2026-11-08T12:00:00Z"),
  status: "PAID", amount: 100, amountUSD: 100,
  currency: "USD", subscriptionId: null, attribution: { utm_source: "meta" },
};
test("never counts optimistic PAID or failed recurring invoices as settled money", () => {
  const result = summarizeSettledAttribution([
    { ...base, id: "settled" },
    { ...base, id: "optimistic", paidAt: null, subscriptionId: "sub1" },
    { ...base, id: "failed", status: "FAILED", subscriptionId: "sub2" },
  ]);
  assert.equal(result.totals.settledDonations, 1);
  assert.equal(result.totals.settledUsdKnown, 100);
  assert.equal(result.totals.unsettledExcluded, 2);
});

test("does not treat TRY or EUR amount as USD when no confirmed USD conversion exists", () => {
  const result = summarizeSettledAttribution([
    { ...base, id: "try1", currency: "TRY", amount: 1000, amountUSD: null },
    { ...base, id: "usd1", currency: "USD", amount: 12, amountUSD: null },
    { ...base, id: "eur1", currency: "EUR", amount: 85, amountUSD: 90 },
  ]);
  assert.equal(result.totals.settledUsdKnown, 102);
  assert.equal(result.totals.missingUsd, 1);
  assert.equal(settledUsdValue({ currency: "TRY", amount: 1000, amountUSD: null }), null);
});

test("deduplicates by donation id and separates recurring receipts from one-off", () => {
  const result = summarizeSettledAttribution([
    { ...base, id: "1", subscriptionId: "sub1" },
    { ...base, id: "1", subscriptionId: "sub1" },
    { ...base, id: "2", amountUSD: 40, amount: 40 },
  ]);
  assert.equal(result.totals.settledDonations, 2);
  assert.equal(result.totals.recurring, 1);
  assert.equal(result.totals.oneTime, 1);
  assert.equal(result.totals.settledUsdKnown, 140);
});

test("reports unattributed and suspicious campaign sources conservatively", () => {
  const result = summarizeSettledAttribution([
    { ...base, id: "1", attribution: null },
    { ...base, id: "2", attribution: { utm_source: "META\n" } },
    { ...base, id: "3", attribution: { utm_source: "<script>alert(1)</script>" } },
  ]);
  assert.deepEqual(result.sources.map((x) => x.source).sort(), ["غير منسوب", "meta", "scriptalert1script"].sort());
});
