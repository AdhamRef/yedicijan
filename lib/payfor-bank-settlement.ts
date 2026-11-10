/**
 * QNB OrderInquiry is read-only and returns AuthCode, HostRefNum,
 * ProcReturnCode, TransId and ErrMsg. The published response schema does
 * not independently attest PurchAmount or Currency.
 *
 * Browser callbacks DO NOT sign amount or currency. Do not infer financial
 * identity from callback fields even with a valid ResponseHash.
 *
 * The legacy flow is on HOLD until a bank-approved server-to-server source
 * proves the order ID, original amount/currency and settled state together.
 * No environment flag can bypass this gate.
 *
 * https://vpos.qnbfinansbank.com/Help/apiOrderInquiry
 * https://vpos.qnbfinansbank.com/Help/responseHash
 */
export function hasBankVerifiedFinancialSettlement(_bankEvidence: unknown): boolean {
  return false;
}
