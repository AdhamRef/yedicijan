import "server-only";

import { prisma } from "@/lib/prisma";
import { getActiveMetaWhatsappRuntimeConfig } from "./runtime-config";
import { createDeliveryRecord, markDeliveryStatus } from "./delivery-log-service";
import { parseInboxConversationId } from "./inbox-conversations";

/**
 * Replying to a donor from the WhatsApp conversations page (ported from Minber al-Aqsa's reply service,
 * written on Yedicihan's own sender rows, delivery archive and Meta runtime; text only).
 *
 * WhatsApp allows a business free-form text only inside the 24 hours following the contact's last
 * message. Outside it, only an approved template may be sent. A business-initiated free-text message is
 * rejected by Meta, so the window is checked from the archive before anything is sent, and the answer is
 * reported plainly.
 *
 * The reply is archived as a `CommunicationDelivery` like every other outbound message, with
 * `origin: "MANUAL"`, so it appears in the conversation's timeline.
 */

/** Meta's customer-service window. */
const WINDOW_MS = 24 * 60 * 60 * 1000;

const digitsOf = (phone: string | null | undefined) => String(phone ?? "").replace(/\D/g, "").replace(/^00/, "");
/** The ways a number may be stored: Meta sends digits, the site stores +digits. */
export function phoneVariants(phone: string | null | undefined): string[] {
  const d = digitsOf(phone);
  return d.length >= 6 ? [d, `+${d}`] : [];
}
export function toE164(phone: string | null | undefined): string | null {
  const d = digitsOf(phone);
  return d.length >= 6 && d.length <= 16 ? `+${d}` : null;
}

export type ReplyWindow = {
  open: boolean;
  lastInboundAt: string | null;
  /** Milliseconds left in the window; 0 when closed. */
  remainingMs: number;
  /** The wamid of the donor's last message, so the reply threads under it. */
  lastInboundMessageId: string | null;
};

/** Events on the conversation's number: its sender row, or (for the default number) events without one. */
function senderWhere(senderId: string | null) {
  return senderId ? { senderId } : { OR: [{ senderId: null }, { senderId: { isSet: false } }] };
}

export async function replyWindowFor(conversationId: string): Promise<ReplyWindow> {
  const closed: ReplyWindow = { open: false, lastInboundAt: null, remainingMs: 0, lastInboundMessageId: null };
  if (!process.env.DATABASE_URL) return closed;
  const parsed = parseInboxConversationId(conversationId);
  const variants = phoneVariants(parsed?.phone);
  if (!parsed || !variants.length) return closed;

  const last = await prisma.communicationProviderEvent
    .findFirst({
      where: { channel: "WHATSAPP", eventType: "inbound_message", recipient: { in: variants }, ...senderWhere(parsed.senderId) },
      orderBy: { receivedAt: "desc" },
      select: { receivedAt: true, providerMessageId: true },
    })
    .catch(() => null);
  if (!last?.receivedAt) return closed;

  const remaining = Math.max(WINDOW_MS - (Date.now() - last.receivedAt.getTime()), 0);
  return { open: remaining > 0, lastInboundAt: last.receivedAt.toISOString(), remainingMs: remaining, lastInboundMessageId: last.providerMessageId ?? null };
}

export type ConversationSenderResult =
  | { ok: true; to: string; senderId: string | null; phoneNumberId: string; businessAccountId: string | null }
  | { ok: false; reason: string };

/**
 * Who the reply goes to and the number it leaves from. Do-not-contact is checked first: it is an absolute
 * outbound guard that the 24-hour window does not override. A conversation that names a sender row must
 * reply from that exact number; the default number uses the Meta runtime's default phone number id.
 */
export async function conversationSender(conversationId: string): Promise<ConversationSenderResult> {
  const parsed = parseInboxConversationId(conversationId);
  const to = toE164(parsed?.phone);
  if (!parsed || !to) return { ok: false, reason: "INVALID_RECIPIENT" };

  let policyUnavailable = false;
  const blocked = await prisma.donorCommunicationProfile
    .findFirst({ where: { phone: { in: phoneVariants(to) }, doNotContact: true }, select: { id: true } })
    .catch(() => { policyUnavailable = true; return null; });
  if (policyUnavailable) return { ok: false, reason: "CONTACT_POLICY_UNAVAILABLE" };
  if (blocked) return { ok: false, reason: "DO_NOT_CONTACT" };

  const runtime = await getActiveMetaWhatsappRuntimeConfig();
  if (!runtime.configured) return { ok: false, reason: "META_NOT_CONFIGURED" };

  if (parsed.senderId) {
    const known = await prisma.communicationSender
      .findUnique({ where: { id: parsed.senderId }, select: { id: true, channel: true, enabled: true, status: true, phoneNumberId: true, businessAccountId: true } })
      .catch(() => null);
    if (!known) return { ok: false, reason: "CONVERSATION_SENDER_NOT_FOUND" };
    if (!known.enabled || known.status !== "ACTIVE" || known.channel !== "WHATSAPP") return { ok: false, reason: "CONVERSATION_SENDER_UNAVAILABLE" };
    if (!known.phoneNumberId) return { ok: false, reason: "META_SENDER_MISSING_PHONE_NUMBER_ID" };
    return { ok: true, to, senderId: known.id, phoneNumberId: known.phoneNumberId, businessAccountId: known.businessAccountId ?? runtime.values.businessAccountId };
  }
  const phoneNumberId = runtime.values.defaultPhoneNumberId;
  if (!phoneNumberId) return { ok: false, reason: "META_SENDER_MISSING_PHONE_NUMBER_ID" };
  return { ok: true, to, senderId: null, phoneNumberId, businessAccountId: runtime.values.businessAccountId };
}

export type ReplyResult =
  | { ok: true; deliveryId: string; providerMessageId: string | null }
  | { ok: false; reason: string; detail?: string | null };

export async function sendConversationReply(
  conversationId: string,
  body: string,
  actor?: { actorId?: string | null } | null,
): Promise<ReplyResult> {
  const text = body.trim();
  if (!text) return { ok: false, reason: "EMPTY_BODY" };
  if (text.length > 4096) return { ok: false, reason: "BODY_TOO_LONG" };

  const sender = await conversationSender(conversationId);
  if (!sender.ok) return sender;

  const window = await replyWindowFor(conversationId);
  if (!window.open) {
    /* Told before the send, not after: outside the window Meta refuses free text, and the operator
       needs to reach for an approved template instead. */
    return { ok: false, reason: "REPLY_WINDOW_CLOSED", detail: window.lastInboundAt };
  }

  const created = await createDeliveryRecord({
    channel: "WHATSAPP",
    provider: "META_WHATSAPP",
    origin: "MANUAL",
    purpose: "UTILITY",
    recipientPhone: sender.to,
    renderedBody: text,
    senderId: sender.senderId,
    createdBy: actor?.actorId ?? null,
    status: "RENDERED",
  });
  if (!created.ok) return { ok: false, reason: "ARCHIVE_FAILED" };

  const { sendTextMessage } = await import("./providers/meta-whatsapp/messages");
  const sent = await sendTextMessage({ phoneNumberId: sender.phoneNumberId, to: sender.to, body: text, replyToMessageId: window.lastInboundMessageId });
  if (!sent.ok) {
    await markDeliveryStatus(created.data.id, "FAILED", { errorMessage: sent.detail ? `${sent.reason} — ${sent.detail}` : sent.reason });
    return { ok: false, reason: sent.reason, detail: sent.detail ?? null };
  }
  const archived = await markDeliveryStatus(created.data.id, "SENT", { providerMessageId: sent.providerMessageId });
  if (!archived.ok) return { ok: false, reason: "ACCEPTED_UNRECORDED" };
  // Conversation layer: the conversation is answered. Lazy and fail-safe: never affects the reply.
  void import("./inbox-conversations")
    .then((m) => m.touchOutbound({ senderId: sender.senderId, phone: sender.to, text, at: new Date() }))
    .catch(() => undefined);
  return { ok: true, deliveryId: created.data.id, providerMessageId: sent.providerMessageId };
}
