import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";
import { auditActorFromDashboardSession, writeAuditLog } from "@/lib/audit-log";
import { resolveDonorIds } from "@/lib/users/donor-filter";
import { loadContextsForUserIds, mergeText } from "@/lib/templates/variables";
import { sendBulkWhatsapp, type WhatsappRecipient } from "@/lib/whatsapp";
import { pickLocale, resolveWhatsappBody } from "@/lib/templates/locale-resolver";
import { logSentMessage } from "@/lib/messaging/log-sent";
import type { Prisma } from "@prisma/client";

const sendSchema = z.object({
  templateId: z.string().min(1),
  /** Optional explicit locale. Omit to use each recipient's preferredLang
   *  (with fallback to ar when the user has none). */
  locale: z.string().optional(),
  target: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("user"), userId: z.string().min(1) }),
    z.object({
      kind: z.literal("filtered"),
      filters: z.object({
        search: z.string().optional(),
        preferredLang: z.string().optional(),
        badgeId: z.string().optional(),
      }),
    }),
  ]),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "templates");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { templateId, target } = parsed.data;

  const template = await prisma.whatsappTemplate.findUnique({ where: { id: templateId } });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  let userIds: string[] = [];
  if (target.kind === "user") {
    userIds = [target.userId];
  } else {
    userIds = await resolveDonorIds(target.filters);
  }

  if (userIds.length === 0) {
    return NextResponse.json({ sent: 0, failed: [], skipped: 0, total: 0 });
  }

  const contexts = await loadContextsForUserIds(userIds);

  const actor = auditActorFromDashboardSession(session!);

  type RenderedRecipient = {
    userId: string;
    phone: string;
    body: string;
    locale: string;
    variables: Prisma.InputJsonValue;
    recipientName: string | null;
  };
  const renderedByPhone = new Map<string, RenderedRecipient>();
  const recipients: WhatsappRecipient[] = [];
  let skipped = 0;
  for (const id of userIds) {
    const ctx = contexts.get(id);
    if (!ctx || !ctx.user.phone) {
      skipped += 1;
      if (ctx) {
        const localeForSkip = pickLocale({
          override: parsed.data.locale,
          recipientLang: ctx.user.preferredLang,
        });
        const variantForSkip = resolveWhatsappBody(template, localeForSkip);
        await logSentMessage({
          channel: "WHATSAPP",
          origin: "MANUAL",
          status: "SKIPPED",
          templateId: template.id,
          templateName: template.name,
          locale: localeForSkip,
          recipientUserId: ctx.user.id,
          recipientPhone: null,
          recipientName: ctx.user.name || null,
          renderedBody: variantForSkip.body,
          variables: ctx as unknown as Prisma.InputJsonValue,
          errorMessage: "Recipient has no phone number",
          actorId: actor.actorId ?? null,
          actorName: actor.actorName ?? null,
        });
      }
      continue;
    }
    const locale = pickLocale({
      override: parsed.data.locale,
      recipientLang: ctx.user.preferredLang,
    });
    const variant = resolveWhatsappBody(template, locale);
    const body = mergeText(variant.body, ctx);
    recipients.push({ to: ctx.user.phone, body });
    renderedByPhone.set(ctx.user.phone, {
      userId: ctx.user.id,
      phone: ctx.user.phone,
      body,
      locale,
      variables: ctx as unknown as Prisma.InputJsonValue,
      recipientName: ctx.user.name || null,
    });
  }

  const result = await sendBulkWhatsapp(recipients);

  const failedSet = new Map(result.failed.map((f) => [f.to, f.error]));
  for (const r of renderedByPhone.values()) {
    const failure = failedSet.get(r.phone);
    await logSentMessage({
      channel: "WHATSAPP",
      origin: "MANUAL",
      status: failure ? "FAILED" : "SENT",
      templateId: template.id,
      templateName: template.name,
      locale: r.locale,
      recipientUserId: r.userId,
      recipientPhone: r.phone,
      recipientName: r.recipientName,
      renderedBody: r.body,
      variables: r.variables,
      errorMessage: failure ?? null,
      actorId: actor.actorId ?? null,
      actorName: actor.actorName ?? null,
    });
  }

  await writeAuditLog({
    ...actor,
    action: "WHATSAPP_TEMPLATE_SEND",
    messageAr: `أرسل قالب واتساب «${template.name}» — نجح ${result.sent} / تخطّي ${skipped} / فشل ${result.failed.length}`,
    entityType: "WhatsappTemplate",
    entityId: template.id,
    metadata: {
      target: target.kind,
      total: userIds.length,
      sent: result.sent,
      skipped,
      failed: result.failed.length,
      localeOverride: parsed.data.locale ?? null,
    },
    stream: "TEAM",
  });

  return NextResponse.json({
    total: userIds.length,
    sent: result.sent,
    skipped,
    failed: result.failed,
  });
}
