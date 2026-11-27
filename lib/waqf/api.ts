/** Shared guard for the dashboard's waqf endpoints. */
import { NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { auditActorFromDashboardSession, writeAuditLog } from "@/lib/audit-log";
import { clearWaqfCache } from "./cache";

export async function waqfAdmin(): Promise<{ session: Session } | { denied: NextResponse }> {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "waqf");
  if (denied) return { denied };
  return { session: session! };
}

export async function waqfAudit(session: Session, action: string, messageAr: string, entityId?: string) {
  clearWaqfCache();
  const actor = auditActorFromDashboardSession(session);
  await writeAuditLog({ ...actor, action, messageAr: `${actor.actorName ?? "مسؤول"} ${messageAr}`, entityType: "WaqfFund", entityId });
}

export function serverError(err: unknown, what: string) {
  console.error(`[waqf] ${what}:`, err);
  return NextResponse.json({ error: "تعذّر الحفظ، حاول مرة أخرى" }, { status: 500 });
}
