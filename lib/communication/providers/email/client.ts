import type { ElasticEmailRuntimeConfig } from "../elastic-email/client";
import { sendElasticEmail, isElasticEmailConfigured } from "../elastic-email/client";
import { ELASTIC_EMAIL_REASONS } from "../elastic-email/errors";

/**
 * Channel-level email facade. Email in the final architecture is Elastic Email; callers depend on
 * this module (not the vendor adapter) so a future provider swap stays a one-file change.
 */

export const EMAIL_PROVIDER_ID = "ELASTIC_EMAIL" as const;

export const EMAIL_REASONS = {
  NOT_CONFIGURED: ELASTIC_EMAIL_REASONS.NOT_CONFIGURED,
  SENDER_MISSING_IDENTITY: ELASTIC_EMAIL_REASONS.SENDER_NOT_CONFIGURED,
} as const;

export async function isEmailConfigured(runtime?: ElasticEmailRuntimeConfig): Promise<boolean> {
  return isElasticEmailConfigured(runtime);
}

export type EmailSendInput = {
  to: string;
  subject: string;
  html: string;
  text?: string | null;
  senderName?: string | null;
  senderEmail?: string | null;
  replyTo?: string | null;
  channelName?: string | null;
  /** The message's language: picks the institution's sender name when none is set explicitly. */
  locale?: string | null;
  /** MARKETING campaigns keep the configured sender name (#268). */
  purpose?: string | null;
};

/**
 * The institution's name as the e-mail sender, in the message's language (Minber al-Aqsa #262): the
 * association's official name as the site shows it (AboutUs.associationName). Other languages use the
 * English form. A sender name set explicitly always wins; with no language either, the configured name is used.
 */
const INSTITUTION_SENDER_NAMES: Record<string, string> = {
  ar: "الهيئة الدولية للإغاثة الإنسانية",
  en: "Yedicihan International Solidarity Association",
  fr: "Association Internationale de Solidarité Yedicihan",
  tr: "Yedicihan Uluslararası Yardımlaşma Derneği",
  id: "Asosiasi Solidaritas Internasional Yedicihan",
  pt: "Associação Internacional de Solidariedade Yedicihan",
  es: "Asociación Internacional de Solidaridad Yedicihan",
  de: "Yedicihan Internationaler Solidaritätsverein",
};
export function institutionSenderName(locale: string | null | undefined): string | null {
  const lang = (locale ?? "").trim().toLowerCase().split(/[-_]/)[0];
  if (!lang) return null;
  return INSTITUTION_SENDER_NAMES[lang] ?? INSTITUTION_SENDER_NAMES.en;
}

export type EmailSendResult =
  | { ok: true; providerId: typeof EMAIL_PROVIDER_ID; providerMessageId: string | null; internalAccepted: boolean }
  | { ok: false; reason: string; detail?: string };

export async function sendEmailMessage(input: EmailSendInput, runtime?: ElasticEmailRuntimeConfig): Promise<EmailSendResult> {
  const res = await sendElasticEmail({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    // The localized institution name is for automatic messages only, never marketing campaigns (#268).
    senderName: input.senderName?.trim() || (input.purpose === "MARKETING" ? null : institutionSenderName(input.locale)) || input.senderName,
    senderEmail: input.senderEmail,
    replyTo: input.replyTo,
    channelName: input.channelName,
  }, runtime);
  if (!res.ok) return { ok: false, reason: res.reason, detail: res.detail };
  return { ok: true, providerId: EMAIL_PROVIDER_ID, providerMessageId: res.providerMessageId, internalAccepted: res.internalAccepted };
}
