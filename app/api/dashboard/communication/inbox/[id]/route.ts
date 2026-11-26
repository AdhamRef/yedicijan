import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { getConversation, markConversationHandled } from "@/lib/communication/conversation-service";
import { parseInboxConversationId } from "@/lib/communication/inbox-conversations";
import { replyWindowFor, sendConversationReply } from "@/lib/communication/conversation-reply-service";

/**
 * One WhatsApp conversation (ported from Minber al-Aqsa's inbox API, on Yedicihan's own conversation
 * service): its timeline, the state of WhatsApp's 24-hour reply window, and the actions an operator can take.
 * The window is returned with the timeline, so the reply box can say up front whether free text is possible.
 */
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "messages");
  if (denied) return denied;
  const conversationId = decodeURIComponent((await params).id);
  const parsed = parseInboxConversationId(conversationId);
  if (!parsed) return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });

  const loaded = await Promise.all([getConversation(parsed.phone), replyWindowFor(conversationId)]).catch(() => null);
  if (!loaded) return NextResponse.json({ error: "INBOX_UNAVAILABLE" }, { status: 503 });
  const [conversation, window] = loaded;
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(
    { ok: true, conversation: { id: conversationId, phone: conversation.phone, timeline: conversation.timeline, donor: conversation.donor }, replyWindow: { open: window.open, remainingMs: window.remainingMs } },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reply"), body: z.string().min(1).max(4096) }),
  z.object({ action: z.literal("handled") }),
  z.object({ action: z.literal("template"), templateId: z.string().regex(/^[a-f0-9]{24}$/i), language: z.string().regex(/^[a-z]{2}$/) }),
]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "messages");
  if (denied) return denied;
  const conversationId = decodeURIComponent((await params).id);
  const parsedId = parseInboxConversationId(conversationId);
  if (!parsedId) return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const actor = auditActorFromDashboardSession(session!);

  if (parsed.data.action === "reply") {
    const sent = await sendConversationReply(conversationId, parsed.data.body, actor);
    if (!sent.ok) {
      // A closed window or a do-not-contact donor is the operator's answer, not a server fault.
      const status = sent.reason === "REPLY_WINDOW_CLOSED" || sent.reason === "DO_NOT_CONTACT" ? 409 : 502;
      return NextResponse.json({ error: sent.reason, detail: sent.detail ?? null }, { status });
    }
    return NextResponse.json({ ok: true, deliveryId: sent.deliveryId, providerMessageId: sent.providerMessageId });
  }

  if (parsed.data.action === "template") {
    /* After the 24-hour window an approved template is the only way back to the donor (Minber al-Aqsa #269). */
    const { sendConversationTemplate } = await import("@/lib/communication/conversation-template-service");
    const sent = await sendConversationTemplate(conversationId, parsed.data.templateId, parsed.data.language, actor);
    if (!sent.ok) return NextResponse.json({ error: sent.reason, detail: sent.detail ?? null }, { status: ["DO_NOT_CONTACT", "TEMPLATE_NEEDS_DATA", "TEMPLATE_NOT_APPROVED", "MARKETING_OPTED_OUT"].includes(sent.reason) ? 409 : 502 });
    return NextResponse.json({ ok: true, deliveryId: sent.deliveryId, providerMessageId: sent.providerMessageId });
  }

  await markConversationHandled(parsedId.phone, actor);
  return NextResponse.json({ ok: true });
}
