/**
 * Payment-gateway filter for the dashboard (ported from Minber, YC's gateways only).
 * Filters stored source metadata only; never invokes or changes a gateway.
 */
export const DONATION_PROVIDER_OPTIONS = [
  { value: "ALBARAKA", label: "البركة" },
  { value: "PAYFOR", label: "PayFor" },
  { value: "__unset", label: "بدون بوابة (يدوي / تحويل)" },
] as const;

type Where = Record<string, unknown>;

function one(raw: string): Where | null {
  const value = raw.trim();
  if (!value || value === "all") return null;
  if (value === "__unset") return { OR: [{ provider: null }, { provider: "" }, { provider: { isSet: false } }] };
  return { provider: value.toUpperCase() };
}

/** "a,b" means any of them. */
export function donationProviderWhere(raw: string | null | undefined): Where | null {
  const values = [...new Set(String(raw ?? "").split(",").map((v) => v.trim()).filter((v) => v && v !== "all"))];
  if (values.length <= 1) return one(values[0] ?? "");
  const parts = values.map(one).filter((w): w is Where => w !== null);
  return parts.length === 0 ? null : parts.length === 1 ? parts[0] : { OR: parts };
}

export function mergeDonationProviderFilter(where: Where, raw: string | null | undefined): Where {
  const filter = donationProviderWhere(raw);
  return filter ? { AND: [where, filter] } : where;
}
