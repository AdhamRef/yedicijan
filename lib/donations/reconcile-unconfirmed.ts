import { prisma } from "@/lib/prisma";

/**
 * Age out one-time donations stuck at `status=PAID` with no `paidAt`.
 *
 * Why the state exists: POST /api/donations writes the Donation row optimistically, before the
 * donor has reached the bank's 3D Secure page. The gateway callback is what sets `paidAt` AND
 * increments campaign/category `currentAmount`, both inside one transaction guarded by
 * `paidAt != null`. So `paidAt == null` is proof the money was never credited anywhere — not to
 * revenue, not to a progress bar.
 *
 * Neither bank gateway offers an order-status lookup, so age is the only signal: a row that is
 * still unconfirmed past the stale window is an abandoned cart and is marked FAILED, so it stops
 * masquerading as pending.
 *
 * Idempotent: only rows still lacking `paidAt` are ever touched.
 */

/** Recorded on aged-out rows so an abandoned cart stays distinguishable from a declined card. */
export const ABANDONED_MARKER = "ABANDONED_NEVER_COMPLETED";

export type ReconcileOptions = {
  /** Report what would change without writing. */
  dryRun?: boolean;
  /** A row still unconfirmed after this many hours is marked FAILED. */
  staleAfterHours?: number;
  now?: Date;
};

export type ReconcileSummary = {
  dryRun: boolean;
  scanned: number;
  markedFailed: Array<{ donationId: string; amountUSD: number; ageDays: number }>;
  /** Still within the stale window. */
  leftAlone: number;
  errors: Array<{ donationId: string; error: string }>;
};

export async function reconcileUnconfirmedDonations(options: ReconcileOptions = {}): Promise<ReconcileSummary> {
  const { dryRun = false, staleAfterHours = 48, now = new Date() } = options;

  // Prisma+MongoDB: `field: null` matches only EXPLICIT nulls, never unset fields. These rows are
  // written without paidAt/subscriptionId at all, so each needs an isSet:false arm — filtering on
  // `null` alone silently hides most of the population. Historical subscription rows are left
  // untouched.
  const rows = await prisma.donation.findMany({
    where: {
      status: "PAID",
      AND: [
        { OR: [{ paidAt: null }, { paidAt: { isSet: false } }] },
        { OR: [{ subscriptionId: null }, { subscriptionId: { isSet: false } }] },
      ],
    },
    select: { id: true, createdAt: true, amountUSD: true },
  });

  const summary: ReconcileSummary = {
    dryRun,
    scanned: rows.length,
    markedFailed: [],
    leftAlone: 0,
    errors: [],
  };

  for (const donation of rows) {
    const ageHours = (now.getTime() - donation.createdAt.getTime()) / 3_600_000;
    if (ageHours <= staleAfterHours) {
      summary.leftAlone++;
      continue;
    }

    if (!dryRun) {
      try {
        // Re-check paidAt in the filter so a callback that lands mid-run is never overwritten.
        await prisma.donation.updateMany({
          where: { id: donation.id, OR: [{ paidAt: null }, { paidAt: { isSet: false } }] },
          data: {
            status: "FAILED",
            providerTxnResult: "Abandoned",
            providerErrorMessage: `${ABANDONED_MARKER} — لم يكمل المتبرع عملية الدفع`,
          },
        });
      } catch (error) {
        summary.errors.push({ donationId: donation.id, error: error instanceof Error ? error.message.slice(0, 200) : String(error) });
        continue;
      }
    }
    summary.markedFailed.push({
      donationId: donation.id,
      amountUSD: donation.amountUSD ?? 0,
      ageDays: Math.round(ageHours / 24),
    });
  }

  return summary;
}
