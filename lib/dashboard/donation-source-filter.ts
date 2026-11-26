import { SOURCE_CHANNELS, type SourceChannel } from "../attribution/source-channel";

/** Dashboard filter on the stored, classified source (Donation.sourceChannel). Unknown values are ignored. */
export function donationSourceWhere(value: string | null | undefined): Record<string, unknown> | null {
  // "a,b" means any of them; one value gives exactly the same condition as before (#282).
  const values = [...new Set((value ?? "").split(",").map((v) => v.trim()))]
    .filter((v): v is SourceChannel => v !== "all" && (SOURCE_CHANNELS as readonly string[]).includes(v));
  if (values.length === 0) return null;
  return values.length === 1 ? { sourceChannel: values[0] } : { sourceChannel: { in: values } };
}

export function mergeDonationSourceFilter(where: Record<string, unknown>, value: string | null | undefined): Record<string, unknown> {
  const filter = donationSourceWhere(value);
  return filter ? { AND: [where, filter] } : where;
}
