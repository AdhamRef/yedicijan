import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Donations are inserted with status='PAID' *before* the gateway confirms, so an
 * abandoned checkout leaves a row with status=PAID and no `paidAt`. Revenue means
 * settled money, so those rows are filtered out.
 *
 * Kept as a separate export from `PAID_CONTRIBUTING_FILTER` (rather than deleted)
 * because ~18 call sites import it and the two names document different intents:
 * this one is dashboard/list semantics, that one is campaign currentAmount math.
 */
export const PAID_DONATION_FILTER: Prisma.DonationWhereInput = {
  status: "PAID",
  paidAt: { not: null },
};

/**
 * Strict version  only donations that actually moved money into a campaign.
 * Used by the campaign/category `currentAmount` recompute helpers so we never
 * count a donation the gateway has not confirmed yet.
 */
export const PAID_CONTRIBUTING_FILTER: Prisma.DonationWhereInput = {
  status: "PAID",
  paidAt: { not: null },
};

/**
 * The dashboards' donation status filter, the same three states the tables
 * show: "PAID" (ناجح) is settled money, exactly `PAID_DONATION_FILTER`;
 * "PENDING" (قيد التأكيد) is a row still waiting on its gateway; "FAILED" as
 * stored. Anything else filters nothing. AND-compose it: the PENDING arm
 * carries its own `OR` (Prisma+MongoDB `null` misses an unset field).
 */
export function donationStatusWhere(status: string | null | undefined): Prisma.DonationWhereInput | null {
  if (status === "RESOLVED") return { OR: [PAID_DONATION_FILTER, { status: "FAILED" }] };
  if (status === "PAID") return PAID_DONATION_FILTER;
  if (status === "PENDING") return { status: "PAID", OR: [{ paidAt: null }, { paidAt: { isSet: false } }] };
  if (status === "FAILED") return { status: "FAILED" };
  return null;
}

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
 * When aggregate `_sum.amountUSD` is 0 but paid rows exist, Prisma sum ignored nulls 
 * recompute from rows (USD fallback on `amount` when currency is USD).
 */
export async function donationUsdSumFallback(where: Prisma.DonationWhereInput): Promise<number> {
  const rows = await prisma.donation.findMany({
    where,
    select: { amountUSD: true, amount: true, currency: true },
  });
  return rows.reduce((s, r) => s + donationRowUsdApprox(r), 0);
}
