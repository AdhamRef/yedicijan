import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";
import { auditActorFromDashboardSession, writeAuditLog } from "@/lib/audit-log";
import { resolveDonorIds } from "@/lib/users/donor-filter";
import { loadContextsForUserIds } from "@/lib/templates/variables";
import { renderEmailHtml, renderEmailSubject } from "@/lib/templates/render";
import { sendBulkEmail, type BulkEmailRecipient } from "@/lib/email";
import { pickLocale, resolveEmailVariant } from "@/lib/templates/locale-resolver";
import type { TReaderDocument } from "@usewaypoint/email-builder";
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

  const template = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
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

  // Build recipients and remember the rendered version + context per email so
  // we can write a SentMessage row whether the provider succeeds or fails.
  type RenderedRecipient = {
    userId: string;
    email: string;
    subject: string;
    html: string;
    locale: string;
    variables: Prisma.InputJsonValue;
    recipientName: string | null;
  };
  const renderedByEmail = new Map<string, RenderedRecipient>();
  const recipients: BulkEmailRecipient[] = [];
  let skipped = 0;
  for (const id of userIds) {
    const ctx = contexts.get(id);
    if (!ctx || !ctx.user.email) {
      skipped += 1;
      // Log SKIPPED rows so the history shows attempts that never went out.
      if (ctx) {
        const localeForSkip = pickLocale({
          override: parsed.data.locale,
          recipientLang: ctx.user.preferredLang,
        });
        const variantForSkip = resolveEmailVariant(template, localeForSkip);
        await logSentMessage({
          channel: "EMAIL",
          origin: "MANUAL",
          status: "SKIPPED",
          templateId: template.id,
          templateName: template.name,
          locale: localeForSkip,
          recipientUserId: ctx.user.id,
          recipientEmail: null,
          recipientName: ctx.user.name || null,
          renderedSubject: variantForSkip.subject,
          renderedBody: "",
          variables: ctx as unknown as Prisma.InputJsonValue,
          errorMessage: "Recipient has no email address",
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
    const variant = resolveEmailVariant(template, locale);
    const subject = renderEmailSubject(variant.subject, ctx);
    const html = await renderEmailHtml(variant.document as TReaderDocument, ctx);
    recipients.push({ to: ctx.user.email, subject, html });
    renderedByEmail.set(ctx.user.email, {
      userId: ctx.user.id,
      email: ctx.user.email,
      subject,
      html,
      locale,
      variables: ctx as unknown as Prisma.InputJsonValue,
      recipientName: ctx.user.name || null,
    });
  }

  const result = await sendBulkEmail(recipients);

  // One SentMessage row per recipient. Failures from the provider come back as
  // entries in result.failed; everything else counted as sent.
  const failedSet = new Map(result.failed.map((f) => [f.to, f.error]));
  for (const r of renderedByEmail.values()) {
    const failure = failedSet.get(r.email);
    await logSentMessage({
      channel: "EMAIL",
      origin: "MANUAL",
      status: failure ? "FAILED" : "SENT",
      templateId: template.id,
      templateName: template.name,
      locale: r.locale,
      recipientUserId: r.userId,
      recipientEmail: r.email,
      recipientName: r.recipientName,
      renderedSubject: r.subject,
      renderedBody: r.html,
      variables: r.variables,
      errorMessage: failure ?? null,
      actorId: actor.actorId ?? null,
      actorName: actor.actorName ?? null,
    });
  }

  await writeAuditLog({
    ...actor,
    action: "EMAIL_TEMPLATE_SEND",
    messageAr: `أرسل قالب بريد «${template.name}» — نجح ${result.sent} / تخطّي ${skipped} / فشل ${result.failed.length}`,
    entityType: "EmailTemplate",
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
