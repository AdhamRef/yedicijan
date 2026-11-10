/**
 * Admission gate for OFFICIAL receipts. A PAID sentinel is not settlement.
 * This is a read-only check of previously authenticated provider evidence.
 * Older invoices without verifiable evidence require staff reconciliation.
 */
type DonationForReceipt = {
  id: string; donorId: string; status: string; paidAt: Date | null;
  provider: string | null; providerOrderId: string | null;
  providerAuthCode: string | null; providerTxnResult: string | null;
  providerHostRefNum: string | null; providerProcReturnCode: string | null;
  providerRaw: unknown; subscriptionId: string | null;
  totalAmount: number; currency: string;
};
type InvoiceLedger = {
  invoiceId: string; subscriptionId: string; donorId: string;
  amountSmallestUnit: number; currency: string;
} | null;
export function confirmedDonationForReceipt(d: DonationForReceipt, ledger: InvoiceLedger = null): boolean {
  if (d.status !== "PAID" || !(d.paidAt instanceof Date) ||
      !Number.isFinite(d.paidAt.getTime()) || d.providerTxnResult !== "Success" ||
      !d.providerOrderId || !d.providerAuthCode ||
      !Number.isFinite(d.totalAmount) || d.totalAmount <= 0) return false;
  const expected = Math.round(d.totalAmount * 100);
  if (!Number.isSafeInteger(expected) ||
      Math.abs(d.totalAmount * 100 - expected) > 0.00001) return false;
  const currency = d.currency.toLowerCase();
  if (d.provider === "STRIPE" && d.subscriptionId) {
    // A signed, bank-amount-matched invoice must have been committed
    // atomically with the donation in the settlement ledger.
    return Boolean(ledger && d.providerOrderId.startsWith("in_") &&
      ledger.invoiceId === d.providerOrderId &&
      ledger.subscriptionId === d.subscriptionId &&
      ledger.donorId === d.donorId &&
      ledger.currency.toLowerCase() === currency &&
      ledger.amountSmallestUnit === expected &&
      d.providerAuthCode.startsWith("sub_"));
  }
  if (d.provider === "STRIPE") {
    const raw = d.providerRaw && typeof d.providerRaw === "object"
      ? d.providerRaw as Record<string, unknown> : {};
    const verified = raw.verifiedStripe && typeof raw.verifiedStripe === "object"
      ? raw.verifiedStripe as Record<string, unknown> : null;
    // Never issue for Stripe transactions without the authenticated
    // settlement marker produced by the trusted webhook.
    return Boolean(verified &&
      verified.reference === d.providerOrderId &&
      verified.intentId === d.providerAuthCode &&
      verified.amount === expected &&
      String(verified.currency).toLowerCase() === currency);
  }
  // No generic bank status can attest settlement. Supported legacy bank
  // adapters must provide separately reviewed provider proof before enabling.
  return false;
}
