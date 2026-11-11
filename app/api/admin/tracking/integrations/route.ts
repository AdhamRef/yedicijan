import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { auditActorFromDashboardSession, writeAuditLog } from "@/lib/audit-log";
import { getRawTrackingSettings } from "@/lib/tracking/tracking-settings";
import { effectiveManagedTags, validateManagedTagsInput } from "@/lib/tracking/managed-tags";

export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "private, no-store", "Vary": "Cookie" };

function docId(raw: Record<string, unknown> | null): string | null {
  const id = raw?._id;
  if (typeof id === "string" && /^[a-f0-9]{24}$/i.test(id)) return id;
  if (id && typeof id === "object" && !Array.isArray(id)) {
    const value = (id as Record<string, unknown>).$oid;
    if (typeof value === "string" && /^[a-f0-9]{24}$/i.test(value)) return value;
  }
  return null;
}
function toDateString(value: unknown): string | null {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const nested = (value as Record<string, unknown>).$date;
    return typeof nested === "string" && !Number.isNaN(Date.parse(nested))
      ? new Date(nested).toISOString() : null;
  }
  return null;
}
function responseFromRow(row: Record<string, unknown> | null) {
  const tags = effectiveManagedTags(row);
  return {
    clarity: { ...tags.clarity, configured: Boolean(tags.clarity.id),
      lastChangedAt: toDateString(row?.clarityUpdatedAt), lastExternalVerifiedAt: null },
    gtm: { ...tags.gtm, configured: Boolean(tags.gtm.id),
      lastChangedAt: toDateString(row?.gtmUpdatedAt), lastExternalVerifiedAt: null },
    connectionStatus: "not_verified",
    notice: "Saved configuration and browser script loading do not prove external provider connectivity.",
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "platformConnections");
  if (denied) return denied;
  try {
    const row = await getRawTrackingSettings();
    return NextResponse.json(responseFromRow(row), { headers: HEADERS });
  } catch {
    return NextResponse.json({ error: "Settings are temporarily unavailable" }, { status: 503, headers: HEADERS });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "platformConnectionsManage");
  if (denied) return denied;

  // JSON-only same-origin mutation, in addition to authenticated SameSite cookies.
  const origin = request.headers.get("origin");
  const allowedOrigins = new Set([request.nextUrl.origin]);
  if (process.env.NEXTAUTH_URL) {
    try { allowedOrigins.add(new URL(process.env.NEXTAUTH_URL).origin); } catch {}
  }
  if (!origin || !allowedOrigins.has(origin)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403, headers: HEADERS });
  }
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "JSON required" }, { status: 415, headers: HEADERS });
  }
  const body = await request.json().catch(() => null);
  let parsed;
  try {
    parsed = validateManagedTagsInput(body);
  } catch {
    return NextResponse.json({ error: "Invalid Clarity or GTM configuration" }, { status: 400, headers: HEADERS });
  }

  try {
    const row = await getRawTrackingSettings();
    const actor = auditActorFromDashboardSession(session!);
    const changed: string[] = [];
    for (const [key, value] of Object.entries(parsed)) {
      if (row?.[key] !== value) changed.push(key);
    }
    if (changed.length === 0) return NextResponse.json(responseFromRow(row), { headers: HEADERS });

    const now = new Date();
    const set: Record<string, unknown> = { updatedAt: now, updatedBy: actor.actorId };
    for (const key of changed) set[key] = parsed[key as keyof typeof parsed];
    if (changed.some(x => x.startsWith("clarity"))) set.clarityUpdatedAt = now;
    if (changed.some(x => x.startsWith("gtm"))) set.gtmUpdatedAt = now;
    const id = docId(row);

    if (row && !id) throw Error("Existing settings missing Mongo identifier");
    if (id) {
      const command = {
        update: "TrackingSettings",
        updates: [{ q: { _id: { $oid: id } }, u: { $set: set }, upsert: false }],
      } as unknown as Prisma.InputJsonObject;
      const result = await prisma.$runCommandRaw(command);
      if ((result as Record<string, unknown>).n !== 1) throw Error("Tracking settings record changed during save");
    } else {
      await prisma.$runCommandRaw({
        insert: "TrackingSettings",
        documents: [{ ...set, ...parsed, createdAt: now, metaDonateEventName: "Donate" }],
      });
    }

    await writeAuditLog({
      ...actor, stream: "TEAM", action: "TRACKING_MANAGED_TAGS_UPDATED",
      messageAr: "تعديل إعدادات Microsoft Clarity وGoogle Tag Manager",
      messageEn: "Changed managed browser tracking configuration",
      entityType: "TrackingSettings", entityId: id ?? undefined,
      metadata: { changedFields: changed, secretFieldsChanged: false },
    });
    const updated = await getRawTrackingSettings();
    return NextResponse.json(responseFromRow(updated), { headers: HEADERS });
  } catch {
    return NextResponse.json({ error: "Could not save tracking settings" }, { status: 503, headers: HEADERS });
  }
}
