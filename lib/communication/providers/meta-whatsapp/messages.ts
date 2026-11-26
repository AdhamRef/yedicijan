import { getActiveMetaWhatsappRuntimeConfig } from "../../runtime-config";
import { graphFetch, metaRuntimeFailure, type MetaRuntimeConfig } from "./client";
import { META_REASONS } from "./errors";
import type { SendTemplateInput, SendResult } from "./types";

/**
 * A free-text reply (WhatsApp conversations, ported from Minber al-Aqsa). Meta accepts it only inside the
 * 24-hour customer-service window after the contact's last message; the caller checks the window first.
 */
export async function sendTextMessage(
  input: { phoneNumberId: string; to: string; body: string; replyToMessageId?: string | null },
  runtime?: MetaRuntimeConfig,
): Promise<SendResult> {
  const resolved = runtime ?? await getActiveMetaWhatsappRuntimeConfig();
  if (!resolved.configured) return { ok: false, reason: metaRuntimeFailure(resolved) };
  const phoneNumberId = input.phoneNumberId || resolved.values.defaultPhoneNumberId;
  if (!phoneNumberId) return { ok: false, reason: META_REASONS.SENDER_MISSING_PHONE_NUMBER_ID };
  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: input.to,
    type: "text",
    text: { body: input.body, preview_url: false },
    ...(input.replyToMessageId ? { context: { message_id: input.replyToMessageId } } : {}),
  };
  const result = await graphFetch(resolved.values, `${phoneNumberId}/messages`, { method: "POST", body: JSON.stringify(body) });
  if (!result.ok) return { ok: false, reason: result.reason, detail: result.detail };
  const data = (result.data ?? {}) as { messages?: { id?: unknown }[] };
  const id = data.messages?.[0]?.id;
  if (typeof id !== "string" || !id) return { ok: false, reason: META_REASONS.INVALID_RESPONSE };
  return { ok: true, providerMessageId: id };
}

export async function sendTemplateMessage(input: SendTemplateInput, runtime?: MetaRuntimeConfig): Promise<SendResult> {
  const resolved = runtime ?? await getActiveMetaWhatsappRuntimeConfig();
  if (!resolved.configured) return { ok: false, reason: metaRuntimeFailure(resolved) };
  const phoneNumberId = input.phoneNumberId || resolved.values.defaultPhoneNumberId;
  if (!phoneNumberId) return { ok: false, reason: META_REASONS.SENDER_MISSING_PHONE_NUMBER_ID };

  const body = {
    messaging_product: "whatsapp",
    to: input.to,
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.languageCode },
      ...(input.components && input.components.length ? { components: input.components } : {}),
    },
  };
  const result = await graphFetch(resolved.values, `${phoneNumberId}/messages`, { method: "POST", body: JSON.stringify(body) });
  if (!result.ok) return { ok: false, reason: result.reason, detail: result.detail };
  const data = (result.data ?? {}) as { messages?: { id?: unknown }[] };
  const id = data.messages?.[0]?.id;
  if (typeof id !== "string" || !id) return { ok: false, reason: META_REASONS.INVALID_RESPONSE };
  return { ok: true, providerMessageId: id };
}
