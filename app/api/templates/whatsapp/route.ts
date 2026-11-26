import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";
import { auditActorFromDashboardSession, writeAuditLog } from "@/lib/audit-log";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  body: z.string().min(1).max(4096),
  translations: z
    .record(z.object({ body: z.string().optional() }))
    .optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "templates");
  if (denied) return denied;

  const templates = await prisma.whatsappTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      body: true,
      createdAt: true,
      updatedAt: true,
      provider: true,
      channel: true,
      externalTemplateId: true,
      templateType: true,
      language: true,
      category: true,
      approvalStatus: true,
      header: true,
      footerText: true,
      buttons: true,
      variables: true,
      lastImportedAt: true,
      lastSyncStatus: true,
      lastSyncError: true,
    },
  });
  return NextResponse.json({ templates });
}

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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // A slow Meta publish can outlive the proxy timeout and the client may retry the same create.
  // Never create (and re-submit to Meta) a second template with the same name.
  const existing = await prisma.whatsappTemplate.findFirst({
    where: { name: parsed.data.name, OR: [{ provider: null }, { provider: { isSet: false } }, { provider: { in: ["META_WHATSAPP", "MANUAL"] } }] },
    select: { id: true, name: true },
  });
  if (existing) {
    return NextResponse.json(
      {
        error: `يوجد قالب باسم ${existing.name} بالفعل. افتحه من قائمة القوالب بدلًا من إنشائه مرة أخرى.`,
        code: "WHATSAPP_TEMPLATE_NAME_EXISTS",
        existingId: existing.id,
      },
      { status: 409 },
    );
  }

  const actor = auditActorFromDashboardSession(session!);
  const created = await prisma.whatsappTemplate.create({
    data: {
      name: parsed.data.name,
      body: parsed.data.body,
      translations: parsed.data.translations
        ? (parsed.data.translations as Prisma.InputJsonValue)
        : undefined,
      createdById: actor.actorId,
    },
  });
  await writeAuditLog({
    ...actor,
    action: "WHATSAPP_TEMPLATE_CREATE",
    messageAr: `أنشأ قالب واتساب: ${created.name}`,
    entityType: "WhatsappTemplate",
    entityId: created.id,
    stream: "TEAM",
  });
  return NextResponse.json({ template: created });
}
