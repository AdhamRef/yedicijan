import type { Prisma } from "@prisma/client";

/**
 * A row with status PAID is only financially settled after paidAt is recorded.
 * This applies equally to one-time and recurring donations.
 *
 * Donation history may still display unpaid attempts, but they cannot be
 * reported as collected revenue.
 */
export function isSettledDonation(row: {
  status: string;
  paidAt: Date | string | null | undefined;
}): boolean {
  if (row.status !== "PAID" || row.paidAt == null) return false;
  const date = new Date(row.paidAt);
  return Number.isFinite(date.getTime());
}

/**
 * Unified calendar rule for donation lists and financial exports:
 * - a collected donation belongs to paidAt
 * - a failed or unconfirmed attempt belongs to createdAt.
 *
 * Prisma/MongoDB distinguishes a missing field from a field set to null, so
 * both representations must be included for unsettled historical rows.
 * Compose this predicate using AND to preserve existing category OR filters.
 */
export function reportDonationPeriodWhere(
  range: { gte?: Date; lte?: Date },
): Prisma.DonationWhereInput | null {
  if (range.gte === undefined && range.lte === undefined) return null;
  return {
    OR: [
      { status: "PAID", paidAt: range },
      {
        status: "PAID",
        createdAt: range,
        OR: [{ paidAt: null }, { paidAt: { isSet: false } }],
      },
      { status: "FAILED", createdAt: range },
    ],
  };
}

/**
 * PAID is the settled filter, never the optimistic checkout sentinel.
 * PENDING is a reporting-only virtual status; it is not written to the DB.
 */
export function reportDonationStatusWhere(
  status: string | null | undefined,
): Prisma.DonationWhereInput | null {
  if (status === "PAID") return { status: "PAID", paidAt: { not: null } };
  if (status === "PENDING") {
    return { status: "PAID", OR: [{ paidAt: null }, { paidAt: { isSet: false } }] };
  }
  if (status === "FAILED") return { status: "FAILED" };
  return null;
}
