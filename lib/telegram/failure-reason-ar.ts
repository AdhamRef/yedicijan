/**
 * Turns a payment failure into ARABIC for the Telegram admin channel.
 *
 * Why this exists: `providerErrorMessage` is whatever the gateway returned, often
 * localised to the DONOR's checkout language (older rows include declines in
 * English, French, German and Arabic). The admins read Arabic; the donor's
 * locale is irrelevant to them.
 *
 * Two independent signals, because neither covers everything:
 *   - The banks send a useful CODE and often the useless message "Payment failed"
 *     (verified on PayFor: every one of 51/05/54/V034/MR15/MR05 carries that same text).
 *   - Some rows carry no code but a descriptive, localised MESSAGE.
 * So: try the code first, then pattern-match the message across languages.
 *
 * Deliberately conservative. Codes whose meaning isn't publicly documented
 * (PayFor's V034 / MR15 / MR05) are NOT guessed — they fall through to the
 * unknown branch, which prints the code verbatim so an admin can look it up.
 * Inventing a plausible Arabic reason for an unknown code would be worse than
 * saying "unknown": it would be wrong and unfalsifiable at a glance.
 */

/** Canonical failure reasons, independent of gateway and language. */
type Reason =
  | "INSUFFICIENT_FUNDS"
  | "CARD_DECLINED"
  | "CONTACT_ISSUER"
  | "CARD_NOT_SUPPORTED"
  | "TOO_MANY_ATTEMPTS"
  | "AUTH_FAILED"
  | "INCORRECT_NUMBER"
  | "INCORRECT_CVC"
  | "EXPIRED_CARD"
  | "PROCESSING_ERROR"
  | "CONNECTIVITY";

const ARABIC: Record<Reason, string> = {
  INSUFFICIENT_FUNDS: "رصيد البطاقة غير كافٍ",
  CARD_DECLINED: "تم رفض البطاقة من البنك المُصدِر",
  CONTACT_ISSUER: "تم رفض البطاقة — يحتاج المتبرع للتواصل مع البنك المُصدِر",
  CARD_NOT_SUPPORTED: "البطاقة لا تدعم هذا النوع من العمليات",
  TOO_MANY_ATTEMPTS: "تم الرفض بسبب محاولات متكررة خلال وقت قصير",
  AUTH_FAILED: "تعذّر التحقق من وسيلة الدفع (3D Secure)",
  INCORRECT_NUMBER: "رقم البطاقة غير صحيح",
  INCORRECT_CVC: "رمز التحقق (CVC) غير صحيح",
  EXPIRED_CARD: "البطاقة منتهية الصلاحية",
  PROCESSING_ERROR: "خطأ أثناء المعالجة لدى البنك",
  CONNECTIVITY: "تعذّر الاتصال بمزوّد الدفع",
};

/**
 * PayFor / Ziraat / Albaraka ISO-8583 response codes. Only the universally standardised
 * ones are mapped — the bank's proprietary `V…` / `MR…` codes are intentionally absent.
 */
const PAYFOR_CODES: Record<string, Reason> = {
  "01": "CONTACT_ISSUER",
  "02": "CONTACT_ISSUER",
  "05": "CONTACT_ISSUER", // "do not honor"
  "12": "PROCESSING_ERROR",
  "13": "PROCESSING_ERROR",
  "14": "INCORRECT_NUMBER",
  "51": "INSUFFICIENT_FUNDS",
  "54": "EXPIRED_CARD",
  "57": "CARD_NOT_SUPPORTED",
  "61": "INSUFFICIENT_FUNDS", // exceeds withdrawal amount limit
  "62": "CONTACT_ISSUER", // restricted card
  "65": "TOO_MANY_ATTEMPTS", // exceeds withdrawal frequency
  "91": "PROCESSING_ERROR", // issuer unavailable
  "96": "PROCESSING_ERROR", // system malfunction
};

/**
 * Multilingual message fingerprints, most specific FIRST — "contact your issuer"
 * and "too many attempts" are both also "declined", so a generic decline test
 * must not run before them.
 */
const TEXT_PATTERNS: Array<{ reason: Reason; needles: string[] }> = [
  {
    reason: "CONTACT_ISSUER",
    needles: ["contact your card issuer", "emetteur de votre carte", "kartenaussteller", "البنك المصدر", "مصدر البطاقة", "kortutsteder", "kaartuitgever"],
  },
  {
    reason: "TOO_MANY_ATTEMPTS",
    needles: ["too frequently", "trop frequentes", "محاولات متكررة", "zu haufig", "for ofte", "te vaak", "cok sik"],
  },
  {
    reason: "INSUFFICIENT_FUNDS",
    needles: [
      "insufficient funds", "fonds suffisants", "رصيد كاف", "guthaben", "deckung", "nicht genug",
      "yetersiz bakiye", "onvoldoende saldo", "tillrackligt med pengar", "utilstrekkelig",
      "fondi sufficienti", "saldo insuficiente", "ikke nok penger", "אין מספיק",
    ],
  },
  {
    reason: "CARD_NOT_SUPPORTED",
    needles: [
      "support this type of purchase", "prend pas en charge", "art von kauf",
      "einkauf wird nicht", "karte nicht unterstutzt", "هذا النوع من عمليات الشراء",
      "لا تدعم بطاقتك", "bu tur", "wordt niet ondersteund", "stods inte",
      "non e supportato", "stotter ikke", "ondersteunt dit type",
    ],
  },
  {
    reason: "AUTH_FAILED",
    needles: [
      "unable to authenticate", "authentifier", "لم نتمكن من التحقق", "authentifizieren",
      "3d secure", "authentication", "autentisera", "dogrulayamadik", "autenticare",
      "authenticeren", "autentisere",
    ],
  },
  {
    reason: "INCORRECT_NUMBER",
    needles: ["number is incorrect", "رقم البطاقة غير صحيح", "numero de carte", "kartennummer", "kortnummer", "numero della carta"],
  },
  { reason: "INCORRECT_CVC", needles: ["security code", "cvc", "رمز التحقق"] },
  {
    reason: "EXPIRED_CARD",
    needles: ["expired", "expiree", "منتهية الصلاحية", "abgelaufen", "utlopt", "verlopen", "scaduta", "utgatt", "suresi dolmus"],
  },
  {
    reason: "CONNECTIVITY",
    needles: ["صعوبات في الاتصال", "difficulties connecting", "issues connecting", "connexion", "verbindung"],
  },
  {
    // Most generic — must stay last so "declined because …" hits its specific reason first.
    reason: "CARD_DECLINED",
    needles: [
      "declined", "refus", "تم رفض", "abgelehnt", "reddedil", "geweiger",
      "rifiutat", "avvist", "נדחה", "nekad", "afgewezen", "nekat",
    ],
  },
];

/**
 * Our own internal placeholders. They carry no cause, so echoing them would just
 * put English back into the channel that this module exists to keep Arabic.
 */
const NO_INFO_MESSAGES = [/^payment failed$/i];

/**
 * Fold everything that makes the same word look different across locales:
 * Latin accents (refusé/refusée, numéro), Nordic letters (utløpt), German ß,
 * Arabic diacritics (كافٍ → كاف) and curly apostrophes (doesn’t).
 * Without the accent folding, French and Norwegian declines slip through.
 */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // combining Latin accents
    .replace(/[ً-ْٰ]/g, "") // Arabic diacritics
    .replace(/[ıİ]/g, "i") // Turkish dotless i — NFD does not decompose it
    .replace(/[øØ]/g, "o")
    .replace(/[åÅ]/g, "a")
    .replace(/[æÆ]/g, "ae")
    .replace(/ß/g, "ss")
    .replace(/[’‘`]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export interface FailureSource {
  provider?: string | null;
  providerProcReturnCode?: string | null;
  providerErrorMessage?: string | null;
}

/**
 * Arabic description of why a donation failed. Always returns something in
 * Arabic; when the cause can't be classified it says so and appends the raw
 * gateway detail rather than dropping information the admin might need.
 */
export function describeFailureInArabic(d: FailureSource): string {
  const rawCode = d.providerProcReturnCode?.trim() || "";

  // 1. Stable bank codes win — they're language-independent.
  const byPayfor = rawCode ? PAYFOR_CODES[rawCode.toUpperCase()] : undefined;
  if (byPayfor) return ARABIC[byPayfor];

  // 2. Fall back to fingerprinting the (localised) message text.
  const msg = d.providerErrorMessage?.trim() ?? "";
  if (msg) {
    const norm = normalize(msg);
    for (const { reason, needles } of TEXT_PATTERNS) {
      if (needles.some((n) => norm.includes(normalize(n)))) return ARABIC[reason];
    }
  }

  // 3. Unclassified. Say so honestly and hand over whatever detail exists so the
  //    admin can still act — an unmapped PayFor code is the common case here.
  if (rawCode) return `سبب غير معروف (رمز البنك: ${rawCode})`;
  if (msg && !NO_INFO_MESSAGES.some((re) => re.test(msg))) return `سبب غير معروف — ${msg}`;
  return "فشلت عملية الدفع دون سبب محدد من البنك";
}
