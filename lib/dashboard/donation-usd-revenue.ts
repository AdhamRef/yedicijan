import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Donations are inserted with status='PAID' *before* the gateway confirms,
 * so an abandoned checkout leaves a row with status=PAID and paidAt=null.
 * For one-time donations that combo means "checkout started, never settled" —
 * filter them out of revenue/dashboards.
 *
 * Subscription-linked donations get the lenient treatment: status='PAID' alone
 * is enough. Recurring charges fire automatically with no donor click, so
 * there's no abandonment moment to guard against, and the legacy strict rule
 * left every monthly donation stuck on قيد التأكيد when webhook settlement
 * lagged or PayFor recurring wasn't wired up.
 *
 * IMPORTANT: this filter governs dashboard/list semantics, NOT campaign
 * currentAmount math. Campaign totals are still recomputed under the strict
 * `PAID_CONTRIBUTING_FILTER` below so the webhook stays the single source of
 * truth for incrementing campaign.currentAmount.
 */
export const PAID_DONATION_FILTER: Prisma.DonationWhereInput = {
  status: "PAID",
  OR: [
    { paidAt: { not: null } },
    { subscriptionId: { not: null } },
  ],
};

/**
 * Strict version — only donations that actually moved money into a campaign.
 * Used by the campaign/category `currentAmount` recompute helpers so we never
 * double-count an optimistic subscription sentinel against totals the webhook
 * will still increment when it lands.
 */
export const PAID_CONTRIBUTING_FILTER: Prisma.DonationWhereInput = {
  status: "PAID",
  paidAt: { not: null },
};

/** Single-row USD value for stats when `amountUSD` was never backfilled. */
export function donationRowUsdApprox(row: {
  amountUSD: number | null;
  amount: number;
  currency: string;
}): number {
  if (typeof row.amountUSD === "number" && Number.isFinite(row.amountUSD) && row.amountUSD > 0) {
    return row.amountUSD;
  }
  if (row.currency === "USD" && typeof row.amount === "number" && Number.isFinite(row.amount)) {
    return row.amount;
  }
  return 0;
}

/**
 * When aggregate `_sum.amountUSD` is 0 but paid rows exist, Prisma sum ignored nulls —
 * recompute from rows (USD fallback on `amount` when currency is USD).
 */
export async function donationUsdRevenueFallback(
  where: Prisma.DonationWhereInput
): Promise<{ total: number; oneTime: number; monthly: number }> {
  const rows = await prisma.donation.findMany({
    where,
    select: { amountUSD: true, amount: true, currency: true, subscriptionId: true },
  });
  let total = 0;
  let oneTime = 0;
  let monthly = 0;
  for (const r of rows) {
    const u = donationRowUsdApprox(r);
    total += u;
    if (r.subscriptionId) monthly += u;
    else oneTime += u;
  }
  return { total, oneTime, monthly };
}

export async function donationUsdSumFallback(where: Prisma.DonationWhereInput): Promise<number> {
  const rows = await prisma.donation.findMany({
    where,
    select: { amountUSD: true, amount: true, currency: true },
  });
  return rows.reduce((s, r) => s + donationRowUsdApprox(r), 0);
}
