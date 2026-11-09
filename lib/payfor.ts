import crypto from "crypto";

export type PayForCurrencyCode = "949" | "840" | "978";

export function payForCurrencyCode(currency: string): PayForCurrencyCode {
  const c = String(currency || "").toUpperCase();
  if (c === "TRY" || c === "TL") return "949";
  if (c === "EUR") return "978";
  return "840"; // default USD
}

export function payForLang(locale?: string): "TR" | "EN" {
  const l = String(locale || "").toLowerCase();
  return l === "tr" ? "TR" : "EN";
}

export function formatPayForPurchAmount(amount: number): string {
  // PayFor expects a dot-decimal string (e.g. "10.00").
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "0.00";
  return n.toFixed(2);
}

/**
 * Ziraat Katılım PayFor 3DPay hash.
 * Formula: hex(SHA1(MbrId + OrderId + PurchAmount + OkUrl + FailUrl + TxnType + InstallmentCount + Rnd + MerchantPass))
 * NOTE: MerchantID and UserCode are NOT part of the hash for this bank.
 *       Output is base64 (standard for Turkish bank PayFor MPI implementations).
 */
export function payForHash(params: {
  mbrId: string;
  orderId: string;
  purchAmount: string;
  okUrl: string;
  failUrl: string;
  txnType: string;
  installmentCount: string;
  rnd: string;
  merchantPass: string;
}): string {
  const raw =
    params.mbrId +
    params.orderId +
    params.purchAmount +
    params.okUrl +
    params.failUrl +
    params.txnType +
    params.installmentCount +
    params.rnd +
    params.merchantPass;

  return crypto.createHash("sha1").update(raw, "utf8").digest("base64");
}


/**
 * PayFor bank ResponseHash for approval and decline responses.
 * Unlike the outgoing 3DPay request hash, this signs the bank's reply.
 * A missing response hash is not proof of failure (MPI-stage failures may
 * have a different signature), so callers must leave settlement unresolved.
 */
export function verifyPayForResponseHash(response: Record<string, unknown>, merchantPass: string | undefined): boolean {
  const provided = String(response.ResponseHash ?? "");
  if (!merchantPass || !provided) return false;
  const field = (name: string) => String(response[name] ?? "");
  const raw = field("MerchantID") + merchantPass +
    field("OrderId") + field("AuthCode") +
    field("ProcReturnCode") + field("ResponseRnd");
  const expected = crypto.createHash("sha1").update(raw, "utf8").digest("base64");
  const actual = Buffer.from(provided, "utf8");
  const signed = Buffer.from(expected, "utf8");
  return actual.length === signed.length && crypto.timingSafeEqual(actual, signed);
}

/** Prevent PCI and authentication secrets entering centralized application logs. */
const PAYFOR_SECRET_KEY = /pan|card *(no|number)|cvv|cvc|expiry|expdate|password|pass|secret|hash|mac/i;
export function redactPayForResponse(raw: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    result[key] = PAYFOR_SECRET_KEY.test(key) ? "[REDACTED]" : value;
  }
  return result;
}
