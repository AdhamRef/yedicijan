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
 * QNB/PayFor 3DPay response integrity verification.
 * See https://vpos.qnbfinansbank.com/Help/responseHash
 * Only bank-signed, exact-case fields are accepted. A browser redirect is
 * never proof of settlement. Missing merchant credentials fail closed.
 */
export function verifyPayForResponseHash(
  fields: Record<string, string>,
  credentials: { merchantId?: string; merchantPass?: string; userCode?: string }
): boolean {
  const { merchantId, merchantPass, userCode } = credentials;
  if (!merchantId || !merchantPass || !userCode) return false;

  const orderId = fields.OrderId;
  const responseRnd = fields.ResponseRnd;
  const responseHash = fields.ResponseHash;
  const procReturnCode = fields.ProcReturnCode;
  const threeDStatus = fields["3DStatus"];
  if (!orderId || !responseRnd || !responseHash || !procReturnCode || !threeDStatus) {
    return false;
  }
  if (!/^[A-Za-z0-9+/]{27}=$/.test(responseHash)) return false;

  const input = [
    merchantId,
    merchantPass,
    orderId,
    fields.AuthCode || "",
    procReturnCode,
    threeDStatus,
    responseRnd,
    userCode,
  ].join("");

  const expected = crypto.createHash("sha1").update(input, "utf8").digest();
  const received = Buffer.from(responseHash, "base64");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

/** Compare bank amounts at cent precision without accepting missing/invalid values. */
export function payForAmountMatches(
  response: string | undefined,
  expected: string | undefined
): boolean {
  if (!response || !expected) return false;
  const valid = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
  if (!valid.test(response) || !valid.test(expected)) return false;
  const a = Number(response);
  const b = Number(expected);
  return Number.isFinite(a) && a > 0 && Number.isSafeInteger(Math.round(a * 100)) &&
    Number.isFinite(b) && b > 0 && Number.isSafeInteger(Math.round(b * 100)) &&
    Math.round(a * 100) === Math.round(b * 100);
}
