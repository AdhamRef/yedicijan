import { randomUUID } from "node:crypto";
import { albarakaConfig, albarakaInquireSale, isAlbarakaConfigured } from "@/lib/albaraka";
import { settleAlbarakaDonation } from "./albaraka-settlement";
import { donationFieldEmpty, donationWhereAll } from "./mongo-null";
import { PAYFOR_UNVERIFIED_APPROVAL } from "@/lib/payfor";
import { prisma } from "@/lib/prisma";

/**
 * Reconcile one-time donations stuck at `status=PAID` with no `paidAt`.
 *
 * Why the state exists: POST /api/donations writes the Donation row optimistically, before the
 * donor has reached the bank's 3D Secure page. The gateway callback is what sets `paidAt` AND
 * increments campaign/category `currentAmount`, both inside one transaction guarded by
 * `paidAt != null`. So `paidAt == null` is proof the money was never credited anywhere — not to
 * revenue, not to a progress bar.
 *
 * That makes this population two very different things mixed together:
 *   - donors who never finished paying (the overwhelming majority), and
 *   - donors who DID pay but whose callback never completed — real money, silently missing.
 *
 * Albaraka rows are asked of the bank (status inquiry by order id), at most once per half hour
 * per donation. An approved sale is settled through the same settlement the callback uses; only
 * an authoritative "no sale" past `staleAfterHours` expires the attempt. Unreachable or
 * ambiguous replies stay held.
 *
 * PayFor offers no order-status lookup, so age is the only signal there: a row still
 * unconfirmed past `abandonAfterHours` is an abandoned cart and is marked FAILED. A PayFor
 * approval whose bank signature did not verify is never aged out — it waits for a person.
 *
 * Both effects are idempotent: crediting re-checks `paidAt` inside the transaction, and only
 * rows still lacking `paidAt` are ever touched. Historical subscription rows are left alone.
 */

/** Recorded on aged-out rows so an abandoned cart stays distinguishable from a declined card. */
export const ABANDONED_MARKER = "ABANDONED_NEVER_COMPLETED";

export type ReconcileOptions = {
  /** Report what would change without writing. */
  dryRun?: boolean;
  /** Rows younger than this are still plausibly in-flight and are left alone entirely. */
  minAgeHours?: number;
  /** An Albaraka attempt the bank authoritatively has no sale for can expire after this many hours. */
  staleAfterHours?: number;
  /** A row on a rail with no status lookup (PayFor) is marked abandoned after this many hours. */
  abandonAfterHours?: number;
  now?: Date;
  /** Verify one payment attempt on demand without scanning other donors. */
  donationId?: string;
};

export type ReconcileSummary = {
  dryRun: boolean;
  scanned: number;
  credited: Array<{ donationId: string; amountUSD: number; paidAt: string }>;
  markedFailed: Array<{ donationId: string; amountUSD: number; ageDays: number }>;
  /** Too young, pending at the provider, or not safely reconcilable. */
  leftAlone: number;
  creditedTotalUSD: number;
  errors: Array<{ donationId: string; error: string }>;
};

export async function reconcileUnconfirmedDonations(options: ReconcileOptions = {}): Promise<ReconcileSummary> {
  const {
    dryRun = false,
    minAgeHours = 0.5,
    staleAfterHours = 24,
    abandonAfterHours = 48,
    now = new Date(),
    donationId,
  } = options;
  // Only re-check recent failed Albaraka attempts. A FAILED status must never
  // be promoted without a verified bank Sale.
  const failedRecoverySince = new Date(now.getTime() - 72 * 3_600_000);
  const started = Date.now();

  // Prisma+MongoDB: `field: null` matches only EXPLICIT nulls, never unset fields. These rows are
  // written without paidAt/subscriptionId at all, so each needs an isSet:false arm — filtering on
  // `null` alone silently hides most of the population.
  const rows = await prisma.donation.findMany({
    where: {
      ...(donationId ? { id: donationId } : {}),
      OR: [
        { status: "PAID" },
        // Bank-confirmed sales can remain Processing/PendingConfirmation when
        // local ledger settlement encounters a Mongo write conflict. Inquiry
        // is read-only and never initiates another bank charge.
        { provider: "ALBARAKA", providerTxnResult: { in: ["Processing", "PendingConfirmation"] } },
        // A previously failed 3D return may have a later bank-confirmed Sale.
        { status: "FAILED", provider: "ALBARAKA", createdAt: { gte: failedRecoverySince } },
      ],
      // A bank transfer waits on a finance officer and has no clock: it stays
      // pending until someone confirms or rejects it from the dashboard. Ageing
      // it out here would mark real, slow money abandoned.
      NOT: { provider: "BANK_TRANSFER" },
      AND: [
        { OR: [{ reconciliationNextAt: null }, { reconciliationNextAt: { isSet: false } }, { reconciliationNextAt: { lte: now } }] },
        { OR: [{ paidAt: null }, { paidAt: { isSet: false } }] },
        { OR: [{ subscriptionId: null }, { subscriptionId: { isSet: false } }] },
      ],
    },
    orderBy: { createdAt: donationId ? "asc" : "desc" },
    take: donationId ? 1 : 200,
  });

  const summary: ReconcileSummary = {
    dryRun,
    scanned: rows.length,
    credited: [],
    markedFailed: [],
    leftAlone: 0,
    creditedTotalUSD: 0,
    errors: [],
  };

  const hoursSince = (d: Date) => (now.getTime() - d.getTime()) / 3_600_000;

  for (const donation of rows) {
    if (Date.now() - started > 240_000) break;
    const ageHours = hoursSince(donation.createdAt);
    /* A PayFor approval whose bank signature did not verify waits for a person to
       check it against the bank report; ageing it out would hide a possible charge. */
    if (ageHours < minAgeHours || donation.providerErrorMessage === PAYFOR_UNVERIFIED_APPROVAL) {
      summary.leftAlone++;
      continue;
    }
    if (dryRun) { summary.leftAlone++; continue; }
    const lease = randomUUID();
    const claimed = await prisma.donation.updateMany({
      where: donationWhereAll({ id: donation.id, status: donation.status }, donationFieldEmpty("paidAt"), {
        OR: [{ reconciliationLeaseUntil: null }, { reconciliationLeaseUntil: { isSet: false } }, { reconciliationLeaseUntil: { lt: now } }],
      }, {
        OR: [{ reconciliationNextAt: null }, { reconciliationNextAt: { isSet: false } }, { reconciliationNextAt: { lte: now } }],
      }),
      data: { reconciliationLeaseToken: lease, reconciliationLeaseUntil: new Date(now.getTime() + 300_000) },
    });
    if (claimed.count !== 1) { summary.leftAlone++; continue; }
    try {
      if (donation.provider === "ALBARAKA") {
        const raw = donation.providerRaw && typeof donation.providerRaw === "object" && !Array.isArray(donation.providerRaw) ? donation.providerRaw as Record<string, unknown> : {};
        const request = raw.albarakaRequest && typeof raw.albarakaRequest === "object" ? raw.albarakaRequest as Record<string, unknown> : {};
        const cfg = albarakaConfig();
        if (!isAlbarakaConfigured(cfg) || !donation.providerOrderId || request.orderId !== donation.providerOrderId) { summary.leftAlone++; continue; }
        if ((request.terminalNo && request.terminalNo !== cfg.terminalNo) || (request.merchantNo && request.merchantNo !== cfg.merchantNo)) { summary.errors.push({ donationId: donation.id, error: "BANK_TERMINAL_CHANGED_REQUIRES_REVIEW" }); continue; }
        const answer = await albarakaInquireSale(donation.providerOrderId, cfg);
        if (answer.state === "approved") {
          const saleRows = Array.isArray(answer.raw.TransactionData) ? answer.raw.TransactionData as Array<Record<string, unknown>> : [];
          const sale = saleRows.find(row => String(row.TransactionType ?? "").toLowerCase() === "sale" && row.AuthCode && (!row.OrderId || row.OrderId === donation.providerOrderId));
          if (!sale || (sale.Amount !== undefined && Number(sale.Amount) !== Number(request.amount)) || (sale.Currency && sale.Currency !== request.currencyCode)) {
            summary.errors.push({ donationId: donation.id, error: "BANK_INQUIRY_IDENTITY_REQUIRES_REVIEW" }); continue;
          }
          const settled = await settleAlbarakaDonation(donation.id, { ...answer.raw, AuthCode: answer.authCode, ReferenceCode: String(sale.ReferenceCode ?? "") }, { reconciliation: { checkedAt: now.toISOString(), source: "bank-inquiry" } });
          // An unsuccessful transaction/late competing callback is NOT a credit.
          if (!settled) { summary.errors.push({ donationId: donation.id, error: "BANK_APPROVAL_SETTLEMENT_NOT_COMMITTED" }); continue; }
          summary.credited.push({ donationId: donation.id, amountUSD: donation.amountUSD ?? 0, paidAt: now.toISOString() });
          summary.creditedTotalUSD += donation.amountUSD ?? 0;
        } else if (
          donation.status === "PAID" &&
          answer.state === "absent" &&
          ageHours >= staleAfterHours &&
          // Older snapshots carry no terminal; the main terminal is the only one they could be on.
          (!request.terminalNo || request.terminalNo === cfg.terminalNo) &&
          (!request.merchantNo || request.merchantNo === cfg.merchantNo)
        ) {
          const failed = await prisma.donation.updateMany({ where: donationWhereAll({ id: donation.id, status: "PAID" }, donationFieldEmpty("paidAt")), data: { status: "FAILED", providerTxnResult: "ConfirmationExpired", providerErrorMessage: `PAYMENT_CONFIRMATION_TIMED_OUT — Bank confirmed no sale after ${staleAfterHours} hours` } });
          if (failed.count) summary.markedFailed.push({ donationId: donation.id, amountUSD: donation.amountUSD ?? 0, ageDays: Math.round(ageHours / 24) });
          else summary.leftAlone++;
        } else summary.leftAlone++;
        continue;
      }

      /* PayFor (or a row that never reached any gateway): no status lookup exists,
         so only age can retire it. Unknown rails are preserved for finance review. */
      const ageable = donation.status === "PAID" && (!donation.provider || donation.provider === "PAYFOR");
      if (!ageable || ageHours < abandonAfterHours) { summary.leftAlone++; continue; }
      // Re-check paidAt in the filter so a callback that lands mid-run is never overwritten.
      const failed = await prisma.donation.updateMany({
        where: donationWhereAll({ id: donation.id, status: "PAID" }, donationFieldEmpty("paidAt")),
        data: {
          status: "FAILED",
          providerTxnResult: "Abandoned",
          providerErrorMessage: `${ABANDONED_MARKER} — لم يكمل المتبرع عملية الدفع`,
        },
      });
      if (!failed.count) { summary.leftAlone++; continue; }
      summary.markedFailed.push({
        donationId: donation.id,
        amountUSD: donation.amountUSD ?? 0,
        ageDays: Math.round(ageHours / 24),
      });
    } catch (error) {
      summary.errors.push({ donationId: donation.id, error: error instanceof Error ? error.message.slice(0, 160) : "PROVIDER_CHECK_FAILED" });
    } finally {
      await prisma.donation.updateMany({ where: { id: donation.id, reconciliationLeaseToken: lease }, data: { reconciliationCheckedAt: now, reconciliationNextAt: new Date(now.getTime() + 1_800_000), reconciliationLeaseToken: null, reconciliationLeaseUntil: null } });
    }
  }

  return summary;
}
