/**
 * What GET /api/donations/[id] returns to a guest — someone holding only the donation id
 * (it is in the success-page link, so it can be passed on). Enough for the success and failed
 * pages and the payment-status polling: amounts, status, projects, the bank's result code and
 * the donor's id and name. Not email, phone, birth date, city, attribution or bank references.
 */
export const GUEST_DONATION_FIELDS = [
  "id", "amount", "amountUSD", "currency", "teamSupport", "coverFees", "fees", "totalAmount",
  "status", "paymentStatus", "paidAt", "createdAt", "type", "paymentMethod", "locale",
  "provider", "providerTxnResult", "providerProcReturnCode", "providerErrorMessage",
  "donorId", "items", "categoryItems",
] as const;

export function guestDonationView(d: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of GUEST_DONATION_FIELDS) if (k in d) out[k] = d[k];
  const donor = d.donor as { id?: string; name?: string | null } | null | undefined;
  out.donor = donor ? { id: donor.id, name: donor.name ?? null } : null;
  return out;
}
