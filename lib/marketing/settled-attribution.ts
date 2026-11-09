/**
 * A side-effect-free breakdown of *settled* donation receipts.
 * This is independent of ads-platform conversion claims and never estimates FX.
 */
export type DonationAttributionRecord = {
  id: string;
  status: string;
  paidAt: Date | string | null;
  amountUSD: number | null;
  amount: number;
  currency: string;
  subscriptionId: string | null;
  attribution: unknown;
};

export type SettledAttributionBucket = {
  source: string;
  settledDonations: number;
  settledUsdKnown: number;
  missingUsd: number;
  oneTime: number;
  recurring: number;
};

function sourceName(data: unknown): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "غير منسوب";
  const row = data as Record<string, unknown>;
  const raw = [row.utm_source, row.source, row.channel].find(
    (x) => typeof x === "string" && x.trim().length > 0,
  );
  if (typeof raw !== "string") return "غير منسوب";
  const source = raw.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, "");
  return source ? source.slice(0, 50) : "غير منسوب";
}

export function settledUsdValue(row: Pick<DonationAttributionRecord, "amountUSD" | "amount" | "currency">): number | null {
  if (typeof row.amountUSD === "number" && Number.isFinite(row.amountUSD) && row.amountUSD > 0)
    return row.amountUSD;
  if (row.currency.toUpperCase() === "USD" && Number.isFinite(row.amount) && row.amount >= 0)
    return row.amount;
  return null;
}

export function summarizeSettledAttribution(rows: DonationAttributionRecord[]) {
  const buckets = new Map<string, SettledAttributionBucket>();
  const seen = new Set<string>();
  let unsettledExcluded = 0;
  for (const row of rows) {
    // Never accept an optimistic PAID row without proof of settlement.
    if (row.status !== "PAID" || !row.paidAt) { unsettledExcluded++; continue; }
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    const source = sourceName(row.attribution);
    let bucket = buckets.get(source);
    if (!bucket) {
      bucket = { source, settledDonations: 0, settledUsdKnown: 0,
        missingUsd: 0, oneTime: 0, recurring: 0 };
      buckets.set(source, bucket);
    }
    bucket.settledDonations++;
    if (row.subscriptionId) bucket.recurring++;
    else bucket.oneTime++;
    const usd = settledUsdValue(row);
    if (usd === null) bucket.missingUsd++;
    else bucket.settledUsdKnown += usd;
  }
  const sources = [...buckets.values()].sort((a,b)=>b.settledUsdKnown-a.settledUsdKnown);
  return {
    sources,
    totals: {
      settledDonations: sources.reduce((n, s) => n + s.settledDonations, 0),
      settledUsdKnown: sources.reduce((n, s) => n + s.settledUsdKnown, 0),
      missingUsd: sources.reduce((n, s) => n + s.missingUsd, 0),
      oneTime: sources.reduce((n, s) => n + s.oneTime, 0),
      recurring: sources.reduce((n, s) => n + s.recurring, 0),
      unsettledExcluded,
    },
  };
}
