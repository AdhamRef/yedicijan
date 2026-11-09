import test from "node:test";
import assert from "node:assert/strict";
import {
  isSettledDonation,
  reportDonationPeriodWhere,
  reportDonationStatusWhere,
} from "../../lib/dashboard/report-donation-filter";

const start = new Date("2026-11-01T00:00:00.000Z");
const end = new Date("2026-11-30T23:59:59.999Z");
const range = { gte: start, lte: end };

test("PAID alone does not prove settlement, including recurring charges", () => {
  assert.equal(isSettledDonation({ status: "PAID", paidAt: null }), false);
  assert.equal(isSettledDonation({ status: "PAID", paidAt: undefined }), false);
  assert.equal(isSettledDonation({ status: "PAID", paidAt: "invalid" }), false);
  assert.equal(isSettledDonation({ status: "FAILED", paidAt: start }), false);
  assert.equal(isSettledDonation({ status: "PAID", paidAt: start }), true);
  assert.equal(isSettledDonation({ status: "PAID", paidAt: start.toISOString() }), true);
});

test("PAID filter excludes pending and PENDING filter finds null or missing paidAt", () => {
  assert.deepEqual(reportDonationStatusWhere("PAID"), {
    status: "PAID",
    paidAt: { not: null },
  });
  assert.deepEqual(reportDonationStatusWhere("PENDING"), {
    status: "PAID",
    OR: [{ paidAt: null }, { paidAt: { isSet: false } }],
  });
  assert.deepEqual(reportDonationStatusWhere("FAILED"), { status: "FAILED" });
  assert.equal(reportDonationStatusWhere("all"), null);
});

test("report period follows paidAt for collected gifts and createdAt for attempts", () => {
  const query = reportDonationPeriodWhere(range);
  assert.deepEqual(query, {
    OR: [
      { status: "PAID", paidAt: range },
      {
        status: "PAID",
        createdAt: range,
        OR: [{ paidAt: null }, { paidAt: { isSet: false } }],
      },
      { status: "FAILED", createdAt: range },
    ],
  });
  assert.equal(reportDonationPeriodWhere({}), null);
});

test("synthetic ledger never adds an unsettled subscription charge to receipts", () => {
  const rows = [
    { status: "PAID", paidAt: start, amountUSD: 13, subscriptionId: null },
    { status: "PAID", paidAt: start, amountUSD: 20, subscriptionId: "monthly-plan" },
    { status: "PAID", paidAt: null, amountUSD: 400, subscriptionId: "monthly-plan" },
    { status: "FAILED", paidAt: null, amountUSD: 500, subscriptionId: "monthly-plan" },
  ];
  assert.equal(
    rows.filter(isSettledDonation).reduce((sum, row) => sum + row.amountUSD, 0),
    33,
  );
  assert.equal(rows.filter(isSettledDonation).length, 2);
});
