import { prisma } from "@/lib/prisma";
import { track as vercelTrack } from "@vercel/analytics/server";
import {
  loadContext,
  loadContextForDonation,
  mergeText,
  type TemplateContext,
} from "@/lib/templates/variables";
import { renderEmailHtml, renderEmailSubject } from "@/lib/templates/render";
import { sendBulkEmail } from "@/lib/email";
import { sendBulkWhatsapp } from "@/lib/whatsapp";
import { writeAuditLog } from "@/lib/audit-log";
import {
  pickLocale,
  resolveEmailVariant,
  resolveWhatsappBody,
} from "@/lib/templates/locale-resolver";
import type { TReaderDocument } from "@usewaypoint/email-builder";
import { notifyDonationEvent } from "@/lib/telegram/notify";
import { logSentMessage } from "@/lib/messaging/log-sent";
import { sendDonationServerConversions } from "@/lib/tracking/donation-conversion-server";
import type { Prisma } from "@prisma/client";

/** Keep in sync with prisma `enum MessageTriggerEvent`. */
export type MessageTriggerEvent =
  | "DONATION_PAID"
  | "DONATION_FAILED"
  | "FIRST_DONATION"
  | "USER_REGISTERED"
  | "SUBSCRIPTION_CREATED"
  | "SUBSCRIPTION_PAYMENT"
  | "SUBSCRIPTION_CANCELLED";

export interface EventDispatchInput {
  /** REQUIRED for all events except those that don't relate to a user. */
  userId?: string;
  /** REQUIRED when the event is donation-related; gives templates the donation context. */
  donationId?: string;
}

interface DispatchResult {
  triggers: number;
  emailsSent: number;
  whatsappSent: number;
  errors: number;
}

/**
 * Best-effort fan-out — never throws to callers. If a template referenced by a
 * trigger has been deleted or fails to render, that trigger is skipped and an
 * audit log row is written. The caller's transaction is unaffected.
 */
export async function dispatchEvent(
  event: MessageTriggerEvent,
  input: EventDispatchInput
): Promise<DispatchResult> {
  const result: DispatchResult = { triggers: 0, emailsSent: 0, whatsappSent: 0, errors: 0 };

  // Telegram notification — fired first so it runs even when there are no
  // email/whatsapp triggers configured, the context fails to load, or the
  // main try-block throws. Donation-related events only.
  if (input.donationId && (event === "DONATION_PAID" || event === "DONATION_FAILED" || event === "FIRST_DONATION")) {
    void notifyDonationEvent(event, input.donationId);
  }

  try {
    const triggers = await prisma.messageTrigger.findMany({
      where: { event, enabled: true },
    });
    result.triggers = triggers.length;
    if (triggers.length === 0) return result;

    let ctx: TemplateContext | null = null;
    if (input.donationId) {
      ctx = await loadContextForDonation(input.donationId);
    } else if (input.userId) {
      ctx = await loadContext(input.userId);
    }
    if (!ctx) {
      await writeAuditLog({
        actorRole: "SYSTEM",
        action: "EVENT_DISPATCH_NO_CONTEXT",
        messageAr: `تعذّر تحميل سياق الحدث ${event}`,
        metadata: { event, ...input },
        stream: "TEAM",
      });
      return result;
    }

    // Auto-fired events have no admin in the loop, so the only locale signal we
    // have is the recipient's preferredLang. Falls back to ar when missing.
    const locale = pickLocale({ recipientLang: ctx.user.preferredLang });

    const variablesSnapshot = ctx as unknown as Prisma.InputJsonValue;

    for (const trigger of triggers) {
      try {
        if (trigger.channel === "EMAIL") {
          const tpl = await prisma.emailTemplate.findUnique({ where: { id: trigger.templateId } });
          if (!tpl) continue;
          const variant = resolveEmailVariant(tpl, locale);
          const html = await renderEmailHtml(variant.document as TReaderDocument, ctx);
          const subject = renderEmailSubject(variant.subject, ctx);
          if (!ctx.user.email) {
            await logSentMessage({
              channel: "EMAIL",
              origin: "TRIGGER",
              status: "SKIPPED",
              templateId: tpl.id,
              templateName: tpl.name,
              triggerEvent: event,
              locale,
              recipientUserId: ctx.user.id,
              recipientEmail: null,
              recipientName: ctx.user.name || null,
              renderedSubject: subject,
              renderedBody: html,
              variables: variablesSnapshot,
              errorMessage: "Recipient has no email address",
              donationId: input.donationId ?? null,
            });
            continue;
          }
          const r = await sendBulkEmail([{ to: ctx.user.email, subject, html }]);
          result.emailsSent += r.sent;
          if (r.failed.length > 0) result.errors += r.failed.length;
          const failure = r.failed[0]?.error;
          await logSentMessage({
            channel: "EMAIL",
            origin: "TRIGGER",
            status: failure ? "FAILED" : "SENT",
            templateId: tpl.id,
            templateName: tpl.name,
            triggerEvent: event,
            locale,
            recipientUserId: ctx.user.id,
            recipientEmail: ctx.user.email,
            recipientName: ctx.user.name || null,
            renderedSubject: subject,
            renderedBody: html,
            variables: variablesSnapshot,
            errorMessage: failure ?? null,
            donationId: input.donationId ?? null,
          });
        } else if (trigger.channel === "WHATSAPP") {
          const tpl = await prisma.whatsappTemplate.findUnique({ where: { id: trigger.templateId } });
          if (!tpl) continue;
          const variant = resolveWhatsappBody(tpl, locale);
          const body = mergeText(variant.body, ctx);
          if (!ctx.user.phone) {
            await logSentMessage({
              channel: "WHATSAPP",
              origin: "TRIGGER",
              status: "SKIPPED",
              templateId: tpl.id,
              templateName: tpl.name,
              triggerEvent: event,
              locale,
              recipientUserId: ctx.user.id,
              recipientPhone: null,
              recipientName: ctx.user.name || null,
              renderedBody: body,
              variables: variablesSnapshot,
              errorMessage: "Recipient has no phone number",
              donationId: input.donationId ?? null,
            });
            continue;
          }
          const r = await sendBulkWhatsapp([{ to: ctx.user.phone, body }]);
          result.whatsappSent += r.sent;
          if (r.failed.length > 0) result.errors += r.failed.length;
          const failure = r.failed[0]?.error;
          await logSentMessage({
            channel: "WHATSAPP",
            origin: "TRIGGER",
            status: failure ? "FAILED" : "SENT",
            templateId: tpl.id,
            templateName: tpl.name,
            triggerEvent: event,
            locale,
            recipientUserId: ctx.user.id,
            recipientPhone: ctx.user.phone,
            recipientName: ctx.user.name || null,
            renderedBody: body,
            variables: variablesSnapshot,
            errorMessage: failure ?? null,
            donationId: input.donationId ?? null,
          });
        }
      } catch (err) {
        result.errors += 1;
        console.error(`dispatchEvent ${event} trigger ${trigger.id} failed`, err);
      }
    }

    await writeAuditLog({
      actorRole: "SYSTEM",
      action: "EVENT_DISPATCH",
      messageAr: `حدث تلقائي ${event} — ${result.emailsSent} بريد، ${result.whatsappSent} واتساب${result.errors ? `، ${result.errors} فشل` : ""}`,
      metadata: { event, ...input, ...result },
      stream: "TEAM",
    });
  } catch (err) {
    console.error(`dispatchEvent ${event} top-level failure`, err);
  }

  return result;
}

/** Special handler — pass donationId; if it's the donor's first PAID donation we also fire FIRST_DONATION. */
export async function dispatchDonationPaid(donationId: string): Promise<void> {
  await dispatchEvent("DONATION_PAID", { donationId });
  // Server-side Meta CAPI + GA4 MP "Donate" — fires immediately on the PAID
  // transition so `conversionEventsSentAt` is set even when the donor never
  // reaches /success/{id} (mobile tab killed during 3DS, ad-blocker, slow
  // network, browser Pixel disabled). The browser Pixel on /success/{id}
  // still fires using the same stable event_id for Meta dedup.
  try {
    const capi = await sendDonationServerConversions(donationId);
    if (!capi.ok && !capi.skipped) {
      console.error("dispatchDonationPaid CAPI returned not-ok", {
        donationId,
        reason: capi.reason ?? capi.error ?? null,
      });
    }
  } catch (err) {
    console.error("dispatchDonationPaid CAPI threw", { donationId, err });
  }
  try {
    const d = await prisma.donation.findUnique({
      where: { id: donationId },
      select: {
        donorId: true,
        amount: true,
        amountUSD: true,
        currency: true,
        type: true,
        provider: true,
      },
    });
    if (!d) return;
    const paidCount = await prisma.donation.count({
      where: { donorId: d.donorId, status: "PAID" },
    });
    if (paidCount === 1) {
      await dispatchEvent("FIRST_DONATION", { donationId });
    }
    // Vercel Analytics — server-side donation_paid (catches tab-close cases).
    try {
      await vercelTrack("donation_paid_server", {
        donation_id: donationId,
        amount: d.amount ?? 0,
        amount_usd: d.amountUSD ?? d.amount ?? 0,
        currency: d.currency ?? "USD",
        donation_type: d.type ?? "ONE_TIME",
        gateway: d.provider ?? null,
        is_first_donation: paidCount === 1,
      });
    } catch (err) {
      console.error("Vercel donation_paid_server track failed", err);
    }
  } catch (err) {
    console.error("dispatchDonationPaid first-donation check failed", err);
  }
}
