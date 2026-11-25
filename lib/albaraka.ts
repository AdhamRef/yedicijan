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

export function albarakaChargeCurrency(): AlbarakaChargeCurrency {
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

/**
 * Readiness means all four identifiers are set *and* the key is long enough to be a
 * real one. The merchant identifiers above have defaults; the key never does.
 *
 * The length floor matters more than it looks. "Non-empty" lets a placeholder like
 * `1` or `changeme` arm the live gateway: the checkout collects real cards, and every
 * payment is then rejected by the bank for a bad MAC *after* a donation row exists.
 * Keys from "Anahtar Yaratma" are ~16 alphanumeric characters, so anything under 8
 * is a placeholder, not a short key.
 */
export const ALBARAKA_MIN_ENC_KEY_LENGTH = 8;

export function isAlbarakaConfigured(cfg: AlbarakaConfig = albarakaConfig()): boolean {
  return Boolean(
    cfg.encKey.trim().length >= ALBARAKA_MIN_ENC_KEY_LENGTH &&
      cfg.merchantNo &&
      cfg.terminalNo &&
      cfg.posnetId
  );
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
  return !res?.TransportFailure && (code === "00" || code === "0000");
}

/**
 * POSTs a transaction to the JSON service. Every request must carry the
 * X-MERCHANT-ID / X-TERMINAL-ID / X-POSNET-ID / X-CORRELATION-ID headers  the bank's
 * support team uses the correlation id to trace a failing order.
 */
export async function albarakaService(
  transactionType: string,
  body: Record<string, unknown>,
  opts: { correlationId: string; config?: AlbarakaConfig; timeoutMs?: number }
): Promise<AlbarakaServiceResponse> {
  const cfg = opts.config ?? albarakaConfig();
  // A hung bank call must not outlive the serverless function: past the timeout
  // the caller treats the outcome as unknown and asks the bank what happened.
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
    signal: AbortSignal.timeout(opts.timeoutMs ?? 40_000),
  });

  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Malformed bank response");
    return res.ok ? parsed as AlbarakaServiceResponse : { ...parsed, TransportFailure: true };
  } catch {
    return {
      ServiceResponseData: {
        ResponseCode: String(res.status),
        ResponseDescription: text.slice(0, 500) || "Malformed response from Albaraka",
      },
      TransportFailure: true,
    };
  }
}

/**
 * True when the bank's answer could not be read (an HTML error page, a gateway
 * 5xx). The transaction may or may not have gone through, so it is not a decline.
 */
export function isAlbarakaTransportFailure(res: AlbarakaServiceResponse | null): boolean {
  return Boolean(res?.TransportFailure);
}

/**
 * Banks answer `0051`-style four-digit codes where the ISO-8583 code is the last
 * two digits. Normalised so the decline catalog can explain them to the donor.
 */
export function albarakaIsoCode(code: string): string {
  const c = String(code || "").trim();
  return /^00\d\d$/.test(c) ? c.slice(2) : c;
}

/** Codes meaning the request itself was refused before reaching the card. */
export const ALBARAKA_MERCHANT_SIDE_CODES: Record<string, string> = {
  // Posnet: MerchantNo / TerminalNo / source IP not authorised for this terminal.
  // From a server this almost always means the outbound IP is not on the
  // terminal's "Sabit IP" list in the merchant portal.
  "0148": "Request not authorised by the bank (terminal or server IP not allowed)",
  "0127": "Order id already used",
};

// ── Status inquiry (Agreement) and void (Reverse) ────────────────────────────

/** MACParams for /Agreement (the document's "İşlem Durum Sorgulama"). */
export const ALBARAKA_INQUIRY_MAC_PARAMS = "MerchantNo:TerminalNo";
/** MACParams for /Reverse (İptal) and /Return (İade). */
export const ALBARAKA_REVERSE_MAC_PARAMS = "MerchantNo:TerminalNo:ReferenceCode:OrderId";

/**
 * Plain SHA256 over MerchantNo + TerminalNo + key. Verified against the document's
 * Capture/Agreement example → wgyfAJPbEPtTtce/+HRlXajSRfYA0J6mUcH+16EbB78=
 */
export function albarakaInquiryMac(cfg: Pick<AlbarakaConfig, "merchantNo" | "terminalNo">, encKey: string): string {
  return sha256Base64(cfg.merchantNo + cfg.terminalNo + encKey);
}

/**
 * Plain SHA256 over MerchantNo + TerminalNo + ReferenceCode + OrderId + key, an
 * absent value taking part as "". Verified against all three /Reverse examples in
 * the document (qhLo/…, ir8Jt…, 9Z4yl…).
 */
export function albarakaReverseMac(
  params: { merchantNo: string; terminalNo: string; referenceCode?: string | null; orderId?: string | null },
  encKey: string
): string {
  return sha256Base64(
    params.merchantNo + params.terminalNo + (params.referenceCode ?? "") + (params.orderId ?? "") + encKey
  );
}

export type AlbarakaInquiryResult =
  | { state: "approved"; authCode: string; raw: AlbarakaServiceResponse }
  | { state: "absent"; raw: AlbarakaServiceResponse }
  | { state: "unknown"; raw: AlbarakaServiceResponse | null; error?: string };

/**
 * Asks the bank whether a sale with this order id went through: the recovery
 * for a /Sale whose answer never arrived. Only a Sale row carrying an approval
 * code counts as approved; "Kayıt Bulunamadı" (E219) means the bank has nothing.
 */
export async function albarakaInquireSale(orderId: string, cfg: AlbarakaConfig): Promise<AlbarakaInquiryResult> {
  let res: AlbarakaServiceResponse;
  try {
    res = await albarakaService(
      "Agreement",
      {
        ApiType: "JSON",
        ApiVersion: "V100",
        MAC: albarakaInquiryMac(cfg, cfg.encKey),
        MACParams: ALBARAKA_INQUIRY_MAC_PARAMS,
        MerchantNo: cfg.merchantNo,
        TerminalNo: cfg.terminalNo,
        IsEncrypted: "N",
        OrderId: orderId,
      },
      { correlationId: `${orderId}Q`, config: cfg, timeoutMs: 20_000 }
    );
  } catch (err) {
    return { state: "unknown", raw: null, error: String(err) };
  }
  if (isAlbarakaTransportFailure(res)) return { state: "unknown", raw: res };

  const code = res.ServiceResponseData?.ResponseCode ?? "";
  if (code === "E219") return { state: "absent", raw: res };
  if (!isAlbarakaApproved(res)) return { state: "unknown", raw: res };

  const rows = Array.isArray(res.TransactionData) ? (res.TransactionData as Array<Record<string, unknown>>) : [];
  const sale = rows.find(
    (r) => String(r.TransactionType ?? "").toLowerCase() === "sale" && String(r.AuthCode ?? "").trim() !== "" && (!r.OrderId || r.OrderId === orderId)
  );
  if (!sale && rows.some(row => String(row.TransactionType ?? "").toLowerCase() === "sale" && row.AuthCode)) return { state: "unknown", raw: res, error: "Order identity mismatch" };
  return sale ? { state: "approved", authCode: String(sale.AuthCode), raw: res } : { state: "absent", raw: res };
}

/**
 * Voids a same-day sale by order id (İptal; only before the bank's end of day).
 * Used when a sale's outcome cannot be established, so the donor is never
 * charged for a donation the site recorded as failed.
 */
export async function albarakaReverseSale(
  orderId: string,
  cfg: AlbarakaConfig,
  referenceCode: string | null = null
): Promise<AlbarakaServiceResponse | null> {
  try {
    return await albarakaService(
      "Reverse",
      {
        ApiType: "JSON",
        ApiVersion: "V100",
        MAC: albarakaReverseMac(
          { merchantNo: cfg.merchantNo, terminalNo: cfg.terminalNo, referenceCode, orderId: referenceCode ? null : orderId },
          cfg.encKey
        ),
        MACParams: ALBARAKA_REVERSE_MAC_PARAMS,
        MerchantNo: cfg.merchantNo,
        TerminalNo: cfg.terminalNo,
        IsEncrypted: "N",
        OrderId: referenceCode ? null : orderId,
        ReferenceCode: referenceCode,
        TransactionType: "Sale",
      },
      { correlationId: `${orderId}R`, config: cfg, timeoutMs: 20_000 }
    );
  } catch (err) {
    console.error("[Albaraka] reverse failed:", orderId, err);
    return null;
  }
}

// ── Card validation ──────────────────────────────────────────────────────────

/** Luhn check on a digits-only PAN of plausible length. */
export function isValidCardNumber(pan: string): boolean {
  if (!/^\d{12,19}$/.test(pan)) return false;
  let sum = 0;
  for (let i = 0; i < pan.length; i++) {
    let d = Number(pan[pan.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** A bank-format YYMM expiry that is a real month and not yet past. */
export function isValidBankExpiry(yymm: string, now: Date = new Date()): boolean {
  if (!/^\d{4}$/.test(yymm)) return false;
  const year = 2000 + Number(yymm.slice(0, 2));
  const month = Number(yymm.slice(2, 4));
  if (month < 1 || month > 12) return false;
  return now.getTime() < Date.UTC(year, month, 1);
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
    "4": "Verification attempted  cardholder chose to enrol later",
    "5": "Verification could not be performed",
    "6": "3D Secure error",
    "7": "System error",
    "8": "Unknown card number",
    "9": "Merchant is not registered for 3D Secure",
  };
  return table[mdStatus] ?? `Unknown 3D status (${mdStatus || "empty"})`;
}

// ── Ported from the shared codebase so its recurring and 2D modules compile. ──
// Recurring stays off unless ALBARAKA_RECURRING_ENABLED=1; checkout is 3D only.

/** The 3D form for a card change on a recurring plan (shared codebase). Signed with
 *  this file's `albarakaFormMac`, the same MAC the checkout's 3D form uses. */
export function buildAlbaraka3DForm(input: {
  orderId: string; amount: number; currencyCode: AlbarakaCurrencyCode; returnUrl: string; locale: string;
  card: { number: string; expireDate: string; cvc2: string; holderName: string };
}, cfg: AlbarakaConfig): Record<string, string> {
  const fields: Record<string, string> = {
    PosnetID: cfg.posnetId, MerchantNo: cfg.merchantNo, TerminalNo: cfg.terminalNo,
    OrderId: input.orderId, TransactionType: "Sale", CardNo: input.card.number,
    ExpiredDate: input.card.expireDate, Cvv: input.card.cvc2, CardHolderName: input.card.holderName,
    Amount: String(input.amount), InstallmentCount: "0", MerchantReturnURL: input.returnUrl,
    Language: albarakaLang(input.locale), CurrencyCode: input.currencyCode,
    UseJokerVadaa: cfg.useJokerVadaa ? "1" : "0", KOICode: "", OpenNewWindow: "0",
    UseOOS: "0", TxnState: "INITIAL", VftCode: "", gsmNo: "", packetCode: "",
  };
  const mac = albarakaFormMac({ merchantNo: cfg.merchantNo, terminalNo: cfg.terminalNo, cardNo: input.card.number, cvc2: input.card.cvc2, expireDate: input.card.expireDate, amount: String(input.amount) }, cfg.encKey);
  return { ...fields, Mac: mac, MacParams: ALBARAKA_FORM_MAC_PARAMS };
}


export type AlbarakaRecurringConfig = AlbarakaConfig & {
  /** Master switch: nothing is charged by the scheduler while this is off. */
  enabled: boolean;
  /** Explicit bank-confirmed Mail Order mode; ordinary ecommerce is the default. */
  mailOrder?: boolean;
};

export function albarakaRecurringConfig(): AlbarakaRecurringConfig {
  const base = albarakaConfig();
  const mailOrder = (process.env.ALBARAKA_RECURRING_MAIL_ORDER || "N").trim().toUpperCase();
  /* A scheduled instalment is a non-3D sale, like the checkout's 2D sale, so
     without a dedicated recurring terminal it runs on the 2D (non-3D) terminal
     with that terminal's own key  never the 3D terminal, which refuses a sale
     without 3D Secure. The first instalment is charged on the 2D terminal, so
     the plan's later ones then go to the same terminal. */
  return {
    ...base,
    terminalNo: process.env.ALBARAKA_RECURRING_TERMINAL_NO || process.env.ALBARAKA_2D_TERMINAL_NO || base.terminalNo,
    posnetId: process.env.ALBARAKA_RECURRING_POSNET_ID || process.env.ALBARAKA_2D_POSNET_ID || base.posnetId,
    encKey: process.env.ALBARAKA_RECURRING_ENC_KEY || process.env.ALBARAKA_2D_ENC_KEY || base.encKey,
    mailOrder: mailOrder === "Y",
    enabled: process.env.ALBARAKA_RECURRING_ENABLED === "1" && ["N", "Y"].includes(mailOrder),
  };
}

export function isAlbarakaRecurringEnabled(cfg: AlbarakaRecurringConfig = albarakaRecurringConfig()): boolean {
  return cfg.enabled && isAlbarakaConfigured(cfg);
}

/** The signup sale uses the 2D terminal; renewals also need their enabled terminal. */
export function isAlbarakaRecurringCheckoutReady(): boolean {
  return isAlbarakaConfigured(albaraka2DConfig()) && isAlbarakaRecurringEnabled();
}

/**
 * Non-3D orders are exactly 24 characters. The scheduler derives them from the plan
 * and the cycle it is charging (`albarakaRecurringOrderId`), so a re-run for the same
 * cycle produces the same id and the bank's own "ORDERID DAHA ONCE KULLANILMIS"
 * refusal becomes a second line of defence against a double charge.
 */
export function albarakaRecurringOrderId(subscriptionId: string, cycleIso: string, attempt: number): string {
  return crypto
    .createHash("sha256")
    .update(`${subscriptionId}:${cycleIso}:${attempt}`, "utf8")
    .digest("hex")
    .slice(0, 24)
    .toUpperCase();
}

/**
 * Saved cards keep their expiry as "MM/YY"; the bank wants "YYMM" ("2612" =
 * December 2026). Empty when the stored value is not a four-digit date.
 */
export function albarakaExpiryFromStored(stored: string): string {
  const digits = String(stored || "").replace(/\D/g, "");
  if (digits.length !== 4) return "";
  return `${digits.slice(2, 4)}${digits.slice(0, 2)}`;
}

/**
 * A card is usable through the last day of its expiry month. Checked before a
 * scheduled charge so an expired card fails the plan with a clear reason
 * instead of a bank decline  and, per `DONATION_LOGIC_SPEC` § 1.3, is the
 * hook for the "update your card" notice a week ahead.
 */
export function isStoredCardExpired(stored: string, now: Date = new Date()): boolean {
  const digits = String(stored || "").replace(/\D/g, "");
  if (digits.length !== 4) return true;
  const month = Number(digits.slice(0, 2));
  const year = 2000 + Number(digits.slice(2, 4));
  if (!(month >= 1 && month <= 12)) return true;
  // First instant of the month after expiry, in UTC  the card is dead from then.
  const firstInvalid = Date.UTC(year, month, 1);
  return now.getTime() >= firstInvalid;
}

/** MACParams the document lists for a standard (non-3D) sale. */
export const ALBARAKA_NON_SECURE_MAC_PARAMS = "MerchantNo:TerminalNo:CardNo:Cvc2:ExpireDate:Amount";

/**
 * MAC for a standard /Sale  same construction as the 3D payment MAC (plain SHA256
 * over the values concatenated without separators, key appended), over the six
 * parameters the document's MACParams names for it. An absent Cvc2 takes part as
 * an empty string, the way absent fields do in every other MAC of this API.
 */
export function albarakaNonSecureSaleMac(
  params: { merchantNo: string; terminalNo: string; cardNo: string; cvc2: string; expireDate: string; amount: number },
  encKey: string
): string {
  return sha256Base64(
    params.merchantNo + params.terminalNo + params.cardNo + params.cvc2 + params.expireDate + String(params.amount) + encKey
  );
}

/**
 * The /Sale body for one scheduled charge. Pure, so the tests can pin the shape
 * without a bank: the card is a stored credential, so it carries no Cvc2, and the
 * transaction remains recurring. Mail Order is independently selected only when
 * the merchant has configured that bank-confirmed transaction class.
 */
export function buildAlbarakaRecurringSale(
  input: {
    orderId: string;
    amount: number;
    currencyCode: AlbarakaCurrencyCode;
    card: { number: string; expireDate: string; holderName: string };
  },
  cfg: AlbarakaRecurringConfig
): Record<string, unknown> {
  const mac = albarakaNonSecureSaleMac(
    {
      merchantNo: cfg.merchantNo,
      terminalNo: cfg.terminalNo,
      cardNo: input.card.number,
      cvc2: "",
      expireDate: input.card.expireDate,
      amount: input.amount,
    },
    cfg.encKey
  );
  return {
    ApiType: "JSON",
    ApiVersion: "V100",
    MerchantNo: cfg.merchantNo,
    TerminalNo: cfg.terminalNo,
    PaymentInstrumentType: "CARD",
    IsEncrypted: "N",
    IsTDSecureMerchant: "N",
    IsMailOrder: cfg.mailOrder === true ? "Y" : "N",
    IsRecurring: "Y",
    CardInformationData: {
      CardHolderName: input.card.holderName,
      CardNo: input.card.number,
      Cvc2: "",
      ExpireDate: input.card.expireDate,
    },
    ThreeDSecureData: null,
    MAC: mac,
    MACParams: ALBARAKA_NON_SECURE_MAC_PARAMS,
    Amount: String(input.amount),
    CurrencyCode: input.currencyCode,
    PointAmount: 0,
    OrderId: input.orderId,
    InstallmentCount: "0",
    InstallmentType: "N",
  };
}

// ── Checkout charges: 2D (non-3D) ────────────────────────────────────────────
//
// The checkout charges Albaraka without 3D Secure: the card is sent straight to
// the bank's /Sale (the document's "Standart Satış") and the answer settles the
// donation there and then  the donor is never sent to the bank's 3D page. The
// 3D callback is kept only for a session that was already in flight.
//
// A non-3D sale runs on a terminal the bank has opened for it. Its numbers go in
// ALBARAKA_2D_TERMINAL_NO / ALBARAKA_2D_POSNET_ID / ALBARAKA_2D_ENC_KEY (the key
// is per terminal); each falls back to the recurring terminal's, then to the
// main one's.

export function albaraka2DConfig(): AlbarakaConfig {
  const base = albarakaConfig();
  return {
    ...base,
    terminalNo: process.env.ALBARAKA_2D_TERMINAL_NO || process.env.ALBARAKA_RECURRING_TERMINAL_NO || base.terminalNo,
    posnetId: process.env.ALBARAKA_2D_POSNET_ID || process.env.ALBARAKA_RECURRING_POSNET_ID || base.posnetId,
    encKey: process.env.ALBARAKA_2D_ENC_KEY || base.encKey,
    // The bank's hosted card page is a 3D feature; a 2D sale always carries the card.
    useOOS: false,
  };
}

/** Non-3D orders are exactly 24 characters: 12 random bytes as uppercase hex. */
export function albaraka2DOrderId(): string {
  return crypto.randomBytes(12).toString("hex").toUpperCase();
}

/**
 * The /Sale body for a donor-present 2D charge: the card with its CVC, neither
 * 3D nor mail-order nor recurring. Pure, so the shape can be pinned without a bank.
 */
export function buildAlbaraka2DSale(
  input: {
    orderId: string;
    amount: number;
    currencyCode: AlbarakaCurrencyCode;
    card: { number: string; expireDate: string; cvc2: string; holderName: string };
  },
  cfg: AlbarakaConfig
): Record<string, unknown> {
  const mac = albarakaNonSecureSaleMac(
    {
      merchantNo: cfg.merchantNo,
      terminalNo: cfg.terminalNo,
      cardNo: input.card.number,
      cvc2: input.card.cvc2,
      expireDate: input.card.expireDate,
      amount: input.amount,
    },
    cfg.encKey
  );
  return {
    ApiType: "JSON",
    ApiVersion: "V100",
    MerchantNo: cfg.merchantNo,
    TerminalNo: cfg.terminalNo,
    PaymentInstrumentType: "CARD",
    IsEncrypted: "N",
    IsTDSecureMerchant: "N",
    IsMailOrder: "N",
    CardInformationData: {
      CardHolderName: input.card.holderName,
      CardNo: input.card.number,
      Cvc2: input.card.cvc2,
      ExpireDate: input.card.expireDate,
    },
    ThreeDSecureData: null,
    MAC: mac,
    MACParams: ALBARAKA_NON_SECURE_MAC_PARAMS,
    Amount: String(input.amount),
    CurrencyCode: input.currencyCode,
    PointAmount: 0,
    OrderId: input.orderId,
    InstallmentCount: "0",
    InstallmentType: "N",
  };
}
