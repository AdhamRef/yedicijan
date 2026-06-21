import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";
import { auditActorFromDashboardSession, writeAuditLog } from "@/lib/audit-log";

const EVENT_VALUES = [
  "DONATION_PAID",
  "DONATION_FAILED",
  "FIRST_DONATION",
  "USER_REGISTERED",
  "SUBSCRIPTION_CREATED",
  "SUBSCRIPTION_PAYMENT",
  "SUBSCRIPTION_CANCELLED",
] as const;

const createSchema = z.object({
  event: z.enum(EVENT_VALUES),
  channel: z.enum(["EMAIL", "WHATSAPP"]),
  templateId: z.string().min(1),
  enabled: z.boolean().optional(),
});

async function enrichTriggers(
  rows: { id: string; event: string; channel: string; templateId: string; enabled: boolean; createdAt: Date; updatedAt: Date }[]
) {
  const emailIds = rows.filter((r) => r.channel === "EMAIL").map((r) => r.templateId);
  const waIds = rows.filter((r) => r.channel === "WHATSAPP").map((r) => r.templateId);
  const [emails, wa] = await Promise.all([
    emailIds.length
      ? prisma.emailTemplate.findMany({
          where: { id: { in: emailIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    waIds.length
      ? prisma.whatsappTemplate.findMany({
          where: { id: { in: waIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);
  const nameById = new Map<string, string>();
  for (const t of emails) nameById.set(`E:${t.id}`, t.name);
  for (const t of wa) nameById.set(`W:${t.id}`, t.name);
  return rows.map((r) => ({
    ...r,
    templateName: nameById.get(`${r.channel === "EMAIL" ? "E" : "W"}:${r.templateId}`) ?? null,
  }));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "templates");
  if (denied) return denied;

  const rows = await prisma.messageTrigger.findMany({
    orderBy: [{ event: "asc" }, { createdAt: "desc" }],
  });
  const triggers = await enrichTriggers(rows);
  return NextResponse.json({ triggers });
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
  const { event, channel, templateId, enabled } = parsed.data;

  // Validate the templateId actually exists in the matching channel's table.
  const exists =
    channel === "EMAIL"
      ? await prisma.emailTemplate.findUnique({ where: { id: templateId }, select: { id: true } })
      : await prisma.whatsappTemplate.findUnique({ where: { id: templateId }, select: { id: true } });
  if (!exists) {
    return NextResponse.json({ error: "Template not found for channel" }, { status: 400 });
  }

  const actor = auditActorFromDashboardSession(session!);
  const created = await prisma.messageTrigger.create({
    data: {
      event,
      channel,
      templateId,
      enabled: enabled ?? true,
      createdById: actor.actorId,
    },
  });

  await writeAuditLog({
    ...actor,
    action: "MESSAGE_TRIGGER_CREATE",
    messageAr: `أضاف حدث تلقائي ${event} (${channel})`,
    entityType: "MessageTrigger",
    entityId: created.id,
    stream: "TEAM",
  });
  return NextResponse.json({ trigger: created });
}
