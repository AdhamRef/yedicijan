import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

export type AuditStream = "TEAM" | "DONOR";

/** After dashboard permission check (admin/staff). */
export function auditActorFromDashboardSession(session: Session): {
  actorId: string;
  actorName: string | null | undefined;
  actorRole: string;
} {
  const u = session.user!;
  return {
    actorId: u.id!,
    actorName: u.name,
    actorRole: u.role ?? "ADMIN",
  };
}

/** Logged-in site user (donor/staff/admin) for public-side actions. */
export function auditActorFromSiteSession(session: Session): {
  actorId: string;
  actorName: string | null | undefined;
  actorRole: string;
} {
  const u = session.user!;
  return {
    actorId: u.id!,
    actorName: u.name,
    actorRole: u.role ?? "DONOR",
  };
}

export function auditStreamForRole(role: string | null | undefined): AuditStream {
  return role === "DONOR" ? "DONOR" : "TEAM";
}

type WriteOpts = {
  actorId?: string | null;
  actorName?: string | null;
  actorRole: string;
  action: string;
  messageAr: string;
  messageEn?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  stream?: AuditStream;
};

/** Best-effort logging; never throws to callers */
export async function writeAuditLog(opts: WriteOpts): Promise<void> {
  try {
    const stream = opts.stream ?? auditStreamForRole(opts.actorRole);
    await prisma.auditLog.create({
      data: {
        actorId: opts.actorId ?? undefined,
        actorName: opts.actorName ?? undefined,
        actorRole: opts.actorRole,
        action: opts.action,
        messageAr: opts.messageAr,
        messageEn: opts.messageEn,
        entityType: opts.entityType,
        entityId: opts.entityId,
        metadata: opts.metadata ?? undefined,
        stream,
      },
    });
  } catch (e) {
    console.error("writeAuditLog failed", e);
  }
}
