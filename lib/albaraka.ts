import crypto from "crypto";

/**
 * Albaraka Türk EPOS (Sanal POS) — 3D Secure integration primitives.
 *
 * Reference: "Sanal Pos 3D Secure Entegrasyon Dokümanı" (Albaraka Türk / Posnet EPOS API).
 *
 * Three MACs are involved. All three are plain **SHA256** (not HMAC) over the relevant
 * values concatenated with **no separator**, with the encryption key appended last, and
 * the digest base64-encoded. Each is verified byte-for-byte against the worked examples
 * in the bank's document — see `tmp/albaraka-vectors.ts`.
 *
 *  1. `albarakaFormMac`     — signs the 3DS redirect form we POST to the bank (§4.3.1).
 *  2. `albarakaResponseMac` — verifies the form the bank POSTs back to us (§4.4.2).
 *  3. `albarakaPaymentMac`  — signs the /Sale call that finalises the 3D auth (§4.5).
 *
 * Each MAC travels with a `MacParams` string naming the fields that went into it, in
 * order, colon-separated and excluding the key.
 *
 * NOTE: an earlier revision of this integration followed a different Albaraka document
 * that specified HMAC-SHA256 over every form field joined with ";" and a `MacNew` field.
 * That spec does not match this merchant's EPOS profile; the bank rejects its MACs. The
 * algorithm below is the one from the PDF that ships with these credentials.
 */

/** Albaraka accepts only these three currency codes. */
export type AlbarakaCurrencyCode = "TL" | "US" | "EU";

export type AlbarakaConfig = {
  merchantNo: string;
  terminalNo: string;
  posnetId: string;
  encKey: string;
  /** Bank page the customer's browser is form-POSTed to for 3D verification. */
  tdsUrl: string;
  /** JSON transaction service root; "/Sale", "/Reverse", … are appended to it. */
  serviceUrl: string;
  /** When true the bank collects the card (Ortak Ödeme Sayfası) and no PAN reaches us. */
  useOOS: boolean;
  /** Opens the bank's Joker Vadaa campaign picker before 3D verification. */
  useJokerVadaa: boolean;
  /** Which currency the bank is asked to charge — see `albarakaChargeCurrency`. */
  chargeCurrency: AlbarakaChargeCurrency;
};

/**
 * ALBARAKA_CHARGE_CURRENCY:
 *  - TRY (default) — every donation is converted to lira and charged in TL.
 *  - USD / EUR     — every donation is converted to that currency.
 *  - DONATION      — charged in the donation's own currency when it is TRY/USD/EUR,
 *                    otherwise converted to TRY.
 * USD/EUR/DONATION need the bank to have opened USD/EUR terminals for this merchant.
 * The older ALBARAKA_MULTI_CURRENCY=1 is still honoured as DONATION when the new
 * variable is not set.
 */
export type AlbarakaChargeCurrency = "TRY" | "USD" | "EUR" | "DONATION";

function albarakaChargeCurrency(): AlbarakaChargeCurrency {
  const raw = process.env.ALBARAKA_CHARGE_CURRENCY?.trim().toUpperCase();
  if (raw === "TL") return "TRY";
  if (raw === "TRY" || raw === "USD" || raw === "EUR" || raw === "DONATION") return raw;
  if (raw) {
    console.warn(`[Albaraka] Unknown ALBARAKA_CHARGE_CURRENCY "${raw}", charging in TRY`);
    return "TRY";
  }
  return process.env.ALBARAKA_MULTI_CURRENCY === "1" ? "DONATION" : "TRY";
}

/**
 * Resolves the ISO currency a donation is actually charged in. Albaraka only takes
 * TRY, USD and EUR, so anything else falls back to TRY.
 */
export function albarakaTargetCurrency(
  donationCurrency: string,
  mode: AlbarakaChargeCurrency
): "TRY" | "USD" | "EUR" {
  if (mode !== "DONATION") return mode;
  const c = String(donationCurrency || "").toUpperCase();
  if (c === "USD" || c === "US") return "USD";
  if (c === "EUR" || c === "EU") return "EUR";
  return "TRY";
}

/**
 * Merchant identifiers default to the values issued for this merchant; they are not
 * secrets (the same numbers are printed in the bank's merchant portal) and having
 * defaults keeps the gateway working without extra deploy config.
 *
 * ALBARAKA_ENC_KEY has no default on purpose — it is the shared secret behind every
 * MAC, and is created from Kurumsal İnternet Bankacılığı → "Anahtar Yaratma".
 */
export function albarakaConfig(): AlbarakaConfig {
  return {
    merchantNo: process.env.ALBARAKA_MERCHANT_NO ?? "6702225453",
    terminalNo: process.env.ALBARAKA_TERMINAL_NO ?? "67A670C0",
    posnetId: process.env.ALBARAKA_POSNET_ID ?? "1010514193725288",
    encKey: process.env.ALBARAKA_ENC_KEY ?? "",
    tdsUrl:
      process.env.ALBARAKA_3DS_URL ??
      "https://epos.albarakaturk.com.tr/ALBSecurePaymentUI/SecureProcess/SecureVerification.aspx",
    serviceUrl: (
      process.env.ALBARAKA_SERVICE_URL ??
      "https://epos.albarakaturk.com.tr/ALBMerchantService/MerchantJSONAPI.svc"
    ).replace(/\/$/, ""),
    useOOS: process.env.ALBARAKA_USE_OOS === "1",
    useJokerVadaa: process.env.ALBARAKA_USE_JOKER_VADAA === "1",
    chargeCurrency: albarakaChargeCurrency(),
  };
}

/** The encryption key is the only piece that can't be defaulted, so it gates readiness. */
export function isAlbarakaConfigured(cfg: AlbarakaConfig = albarakaConfig()): boolean {
  return Boolean(cfg.encKey && cfg.merchantNo && cfg.terminalNo && cfg.posnetId);
}

export function albarakaCurrencyCode(currency: string): AlbarakaCurrencyCode {
  const c = String(currency || "").toUpperCase();
  if (c === "USD" || c === "US") return "US";
  if (c === "EUR" || c === "EU") return "EU";
  return "TL";
}

export function albarakaLang(locale?: string): "TR" | "EN" {
  return String(locale || "").toLowerCase() === "tr" ? "TR" : "EN";
}

/** Amounts travel in minor units — 12.34 TL is sent as 1234. */
export function albarakaMinorUnits(amount: number): number {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

/**
 * 3D orders must be exactly 20 characters (non-3D uses 24, and cancelling a 3D order
 * re-expands it to 24 by prefixing "TDS_"). 10 random bytes as uppercase hex lands on
 * 20 characters with 80 bits of entropy.
 */
export function albarakaOrderId(): string {
  return crypto.randomBytes(10).toString("hex").toUpperCase();
}

function sha256Base64(message: string): string {
  return crypto.createHash("sha256").update(Buffer.from(message, "utf8")).digest("base64");
}

/**
 * Hidden inputs of the 3D verification form, in the order the bank's sample emits them.
 * Only a subset of these is signed — see `ALBARAKA_FORM_MAC_PARAMS`.
 */
export const ALBARAKA_FORM_FIELDS = [
  "PosnetID",
  "MerchantNo",
  "TerminalNo",
  "OrderId",
  "TransactionType",
  "CardNo",
  "ExpiredDate",
  "Cvv",
  "CardHolderName",
  "Amount",
  "InstallmentCount",
  "MerchantReturnURL",
  "Language",
  "CurrencyCode",
  "UseJokerVadaa",
  "KOICode",
  "OpenNewWindow",
  "UseOOS",
  "TxnState",
  "VftCode",
  "gsmNo",
  "packetCode",
] as const;

export type AlbarakaFormFields = Record<(typeof ALBARAKA_FORM_FIELDS)[number], string>;

/** `MacParams` value sent with the 3D form, naming the signed fields in order (§4.3.1). */
export const ALBARAKA_FORM_MAC_PARAMS =
  "MerchantNo:TerminalNo:CardNo:Cvc2:ExpireDate:Amount";

/**
 * `Mac` for the outgoing 3D form (§4.3.1).
 * SHA256 over MerchantNo + TerminalNo + CardNo + Cvc2 + ExpireDate + Amount + encKey,
 * concatenated with no separator. Amount is in kuruş with no punctuation.
 *
 * When the bank's hosted page collects the card, the three card values are sent as
 * empty strings and simply contribute nothing to the concatenation — that is what the
 * document means by "string.Empty", and it is what UseOOS=1 relies on.
 *
 * Verified: 6700950031|67540050|5400619360964581|056|2001|175|10,10,10,10,10,10,10,10
 *           → xuhPbpcPJ6kVs7JeIXS8f06Cv0mb9cNPMfjp1HiB7Ew=
 */
export function albarakaFormMac(
  params: {
    merchantNo: string;
    terminalNo: string;
    cardNo: string;
    cvc2: string;
    expireDate: string;
    amount: string;
  },
  encKey: string
): string {
  return sha256Base64(
    params.merchantNo +
      params.terminalNo +
      params.cardNo +
      params.cvc2 +
      params.expireDate +
      params.amount +
      encKey
  );
}

/** `MacParams` the bank returns with its callback MAC (§4.4.2). */
export const ALBARAKA_RESPONSE_MAC_PARAMS =
  "ECI:CAVV:MdStatus:MdErrorMessage:MD:SecureTransactionId";

/**
 * Recomputes the `Mac` the bank attaches to its callback, proving the 3D verdict wasn't
 * rewritten during the browser round-trip (§4.4.2).
 * SHA256 over ECI + CAVV + MdStatus + MdErrorMessage + MD + SecureTransactionId + encKey.
 *
 * Note this covers the authentication result only — not Amount or OrderId. Those are
 * cross-checked separately in the callback against the snapshot taken at initiate.
 *
 * Verified: 02|jKOBaLBL3hQ+CREBPu1HBQQAAAA=|1|Authenticated|0161…644,0161…644|1010028947569644|key
 *           → r21kMm4nMqvJakjq47Jl+3fk2xrFPrDoTJFQGxkgkfk=
 */
export function albarakaResponseMac(
  values: {
    eci: string;
    cavv: string;
    mdStatus: string;
    mdErrorMessage: string;
    md: string;
    secureTransactionId: string;
  },
  encKey: string
): string {
  return sha256Base64(
    values.eci +
      values.cavv +
      values.mdStatus +
      values.mdErrorMessage +
      values.md +
      values.secureTransactionId +
      encKey
  );
}

/**
 * MAC for the /Sale call that turns a completed 3D verification into money.
 * Plain SHA256 (NOT HMAC) over the values concatenated without separators, with the
 * encryption key appended. The MACParams string sent alongside it is
 * "MerchantNo:TerminalNo:SecureTransactionId:CavvData:Eci:MdStatus".
 * Verified against the bank's worked example → kAKxvbwXvmrM6lapGx1UcRTs454tsSuPrBXV7oA7L7w=
 */
export function albarakaPaymentMac(
  params: {
    merchantNo: string;
    terminalNo: string;
    secureTransactionId: string;
    cavvData: string;
    eci: string;
    mdStatus: string;
  },
  encKey: string
): string {
  return sha256Base64(
    params.merchantNo +
      params.terminalNo +
      params.secureTransactionId +
      params.cavvData +
      params.eci +
      params.mdStatus +
      encKey
  );
}

export const ALBARAKA_PAYMENT_MAC_PARAMS =
  "MerchantNo:TerminalNo:SecureTransactionId:CavvData:Eci:MdStatus";

export type AlbarakaServiceResponse = {
  ServiceResponseData?: { ResponseCode?: string; ResponseDescription?: string };
  AuthCode?: string | null;
  ReferenceCode?: string | null;
  [key: string]: unknown;
};

/**
 * The bank documents "0000" as success but its own sample responses return "00",
 * so both are accepted.
 */
export function isAlbarakaApproved(res: AlbarakaServiceResponse | null): boolean {
  const code = res?.ServiceResponseData?.ResponseCode;
  return code === "00" || code === "0000";
}

/**
 * POSTs a transaction to the JSON service. Every request must carry the
 * X-MERCHANT-ID / X-TERMINAL-ID / X-POSNET-ID / X-CORRELATION-ID headers — the bank's
 * support team uses the correlation id to trace a failing order.
 */
export async function albarakaService(
  transactionType: string,
  body: Record<string, unknown>,
  opts: { correlationId: string; config?: AlbarakaConfig }
): Promise<AlbarakaServiceResponse> {
  const cfg = opts.config ?? albarakaConfig();
  const res = await fetch(`${cfg.serviceUrl}/${transactionType}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-MERCHANT-ID": cfg.merchantNo,
      "X-TERMINAL-ID": cfg.terminalNo,
      "X-POSNET-ID": cfg.posnetId,
      // Max 30 alphanumeric characters per the bank's spec.
      "X-CORRELATION-ID": opts.correlationId.replace(/[^A-Za-z0-9]/g, "").slice(0, 30),
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  try {
    return JSON.parse(text) as AlbarakaServiceResponse;
  } catch {
    return {
      ServiceResponseData: {
        ResponseCode: String(res.status),
        ResponseDescription: text.slice(0, 500) || "Malformed response from Albaraka",
      },
    };
  }
}

/**
 * MdStatus meanings from the bank's table. Only 1 is a real ("full 3D") pass; 2/3/4 are
 * "half 3D" (cardholder or issuer not enrolled) which the bank allows merchants to
 * continue on at their own risk. We stop on anything but 1, as the bank recommends.
 */
export function albarakaMdStatusMessage(mdStatus: string): string {
  const table: Record<string, string> = {
    "0": "Card verification failed",
    "1": "Verification successful",
    "2": "Cardholder or issuer not enrolled in 3D Secure",
    "3": "Card issuer not enrolled in 3D Secure",
    "4": "Verification attempted — cardholder chose to enrol later",
    "5": "Verification could not be performed",
    "6": "3D Secure error",
    "7": "System error",
    "8": "Unknown card number",
    "9": "Merchant is not registered for 3D Secure",
  };
  return table[mdStatus] ?? `Unknown 3D status (${mdStatus || "empty"})`;
}
