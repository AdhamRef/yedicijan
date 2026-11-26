import "server-only";

import { prisma } from "@/lib/prisma";
import { createDeliveryRecord, markDeliveryStatus } from "./delivery-log-service";
import { conversationSender, phoneVariants } from "./conversation-reply-service";
import { sendPreparedDelivery } from "./provider-router";

/**
 * Sending an approved template from a WhatsApp conversation (ported from Minber al-Aqsa #269): after
 * WhatsApp's 24-hour window only an approved template may start the conversation again. Same safeguards
 * as a reply (do-not-contact first, the conversation's own number).
 *
 * Yedicihan adaptations:
 *  - the approved Meta mapping is Yedicihan's own `resolveMetaTemplateMapping` (one language per template row);
 *  - Yedicihan sends Meta templates without parameters (as its automatic messages do), so a template whose
 *    text or header needs a value (a {{variable}}, or an image/video/document header) is refused as
 *    TEMPLATE_NEEDS_DATA and not offered, never guessed;
 *  - Yedicihan's WhatsApp marketing is opt-in (campaigns go only to whatsappOptIn profiles): a MARKETING
 *    template goes only to a number whose profile opted in and is not unsubscribed; service templates stay allowed.
 */
export type ConversationTemplateResult =
  | { ok: true; deliveryId: string; providerMessageId: string | null }
  | { ok: false; reason: string; detail?: string | null };

type TemplateRow = {
  id: string; provider: string | null; approvalStatus: string | null; language: string | null; externalTemplateId: string | null;
  name: string | null; body: string | null; category: string | null; header: unknown; translations: unknown;
};
const TEMPLATE_SELECT = { id: true, provider: true, approvalStatus: true, language: true, externalTemplateId: true, name: true, body: true, category: true, header: true, translations: true } as const;

const VARIABLE = /\{\{\s*[^}]+\}\}/;
/** True when Meta would need a parameter this conversation cannot supply. */
export function templateNeedsData(tpl: { body?: string | null; header?: unknown }): boolean {
  if (VARIABLE.test(String(tpl.body ?? ""))) return true;
  const h = tpl.header && typeof tpl.header === "object" ? (tpl.header as { type?: unknown; text?: unknown }) : null;
  if (!h) return false;
  const type = String(h.type ?? "").toLowerCase();
  if (type && type !== "text" && type !== "none") return true; // image / video / document / location headers carry a value
  return VARIABLE.test(String(h.text ?? ""));
}

/** Marketing needs an opt-in (Yedicihan's rule). An unreadable profile counts as not opted in. */
async function marketingAllowed(to: string): Promise<boolean> {
  const rows = await prisma.donorCommunicationProfile
    .findMany({ where: { phone: { in: phoneVariants(to) } }, select: { whatsappOptIn: true, doNotContact: true }, take: 5 })
    .catch(() => null);
  if (rows === null) return false;
  return rows.some((row) => row.whatsappOptIn && !row.doNotContact);
}
const isMarketing = (tpl: TemplateRow) => String(tpl.category ?? "").toUpperCase() === "MARKETING";

function localizedBody(tpl: TemplateRow, locale: string | null | undefined): string {
  const t = tpl.translations && typeof tpl.translations === "object" ? (tpl.translations as Record<string, { body?: unknown }>)[locale ?? ""] : undefined;
  return String((typeof t?.body === "string" && t.body.trim() ? t.body : tpl.body) ?? "");
}

/** Approved templates this conversation can be sent, in the conversation's language first. */
export async function conversationTemplates(conversationId: string, locale: string): Promise<{ ok: true; templates: Array<{ id: string; name: string; language: string; preview: string }> } | { ok: false; reason: string }> {
  const sender = await conversationSender(conversationId);
  if (!sender.ok) return sender;
  const { resolveMetaTemplateMapping } = await import("./automatic-message-dispatcher");
  const rows = (await prisma.whatsappTemplate.findMany({ select: TEMPLATE_SELECT, take: 200 })) as unknown as TemplateRow[];
  const marketingOk = await marketingAllowed(sender.to);
  const out: Array<{ id: string; name: string; language: string; preview: string }> = [];
  for (const tpl of rows) {
    const mapping = resolveMetaTemplateMapping(tpl, locale);
    if (!mapping) continue;
    if (templateNeedsData(tpl)) continue;
    if (isMarketing(tpl) && !marketingOk) continue;
    out.push({ id: tpl.id, name: String(tpl.name ?? mapping.name), language: mapping.language, preview: localizedBody(tpl, mapping.language).slice(0, 600) });
  }
  out.sort((a, b) => Number(!a.language.startsWith(locale)) - Number(!b.language.startsWith(locale)) || a.name.localeCompare(b.name));
  return { ok: true, templates: out };
}

export async function sendConversationTemplate(conversationId: string, templateId: string, locale: string, actor?: { actorId?: string | null } | null): Promise<ConversationTemplateResult> {
  if (!/^[a-f0-9]{24}$/i.test(templateId)) return { ok: false, reason: "INVALID_TEMPLATE" };
  const sender = await conversationSender(conversationId);
  if (!sender.ok) return sender;
  const tpl = (await prisma.whatsappTemplate.findUnique({ where: { id: templateId }, select: TEMPLATE_SELECT })) as unknown as TemplateRow | null;
  if (!tpl) return { ok: false, reason: "TEMPLATE_NOT_FOUND" };
  const { resolveMetaTemplateMapping } = await import("./automatic-message-dispatcher");
  const mapping = resolveMetaTemplateMapping(tpl, locale);
  if (!mapping) return { ok: false, reason: "TEMPLATE_NOT_APPROVED" };
  if (templateNeedsData(tpl)) return { ok: false, reason: "TEMPLATE_NEEDS_DATA" };
  if (isMarketing(tpl) && !(await marketingAllowed(sender.to))) return { ok: false, reason: "MARKETING_OPTED_OUT" };
  const renderedBody = localizedBody(tpl, mapping.language);
  const created = await createDeliveryRecord({
    channel: "WHATSAPP", provider: "META_WHATSAPP", origin: "MANUAL", purpose: isMarketing(tpl) ? "MARKETING" : "UTILITY",
    recipientPhone: sender.to, renderedBody, templateName: mapping.name, templateId: tpl.id, senderId: sender.senderId,
    locale: mapping.language, createdBy: actor?.actorId ?? null, status: "RENDERED",
  });
  if (!created.ok) return { ok: false, reason: "ARCHIVE_FAILED" };
  const res = await sendPreparedDelivery({
    channel: "WHATSAPP", sender: { provider: "META_WHATSAPP", phoneNumberId: sender.phoneNumberId }, to: sender.to,
    templateName: mapping.name, languageCode: mapping.language,
  });
  if (!res.ok) {
    await markDeliveryStatus(created.data.id, "FAILED", { errorMessage: res.detail ? `${res.reason} — ${res.detail}` : res.reason });
    return { ok: false, reason: res.reason, detail: res.detail ?? null };
  }
  const archived = await markDeliveryStatus(created.data.id, "SENT", { providerMessageId: res.providerMessageId });
  if (!archived.ok) return { ok: false, reason: "ACCEPTED_UNRECORDED" };
  void import("./inbox-conversations")
    .then((m) => m.touchOutbound({ senderId: sender.senderId, phone: sender.to, text: renderedBody, at: new Date() }))
    .catch(() => undefined);
  return { ok: true, deliveryId: created.data.id, providerMessageId: res.providerMessageId };
}
