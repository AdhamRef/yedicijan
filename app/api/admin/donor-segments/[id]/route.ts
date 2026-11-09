import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { getAudienceList, updateAudienceList } from "@/lib/communication/audience-list-service";

type Context = { params: Promise<{ id: string }> };
const objectId = /^[a-f\d]{24}$/i;
const editSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
}).strict();

/** CRM list read: donor-section permission is checked on the API, not only the page. */
export async function GET(_request: NextRequest, { params }: Context) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "donors");
  if (denied) return denied;
  const { id } = await params;
  if (!objectId.test(id)) return NextResponse.json({ error: "القائمة غير موجودة" }, { status: 404 });
  try {
    const record = await getAudienceList(id);
    if (!record || record.list.type !== "CUSTOM")
      return NextResponse.json({ error: "القائمة غير موجودة" }, { status: 404 });
    // This endpoint never returns test recipients or any credentials.
    return NextResponse.json({
      list: record.list,
      members: record.members.filter((m) => m.contactType === "DONOR"),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("CRM list details read failed", error);
    return NextResponse.json({ error: "تعذر تحميل أعضاء القائمة" }, { status: 500 });
  }
}

/** Rename a saved donor list while preserving its members and channel selection. */
export async function PATCH(request: NextRequest, { params }: Context) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "donors");
  if (denied) return denied;
  const { id } = await params;
  if (!objectId.test(id)) return NextResponse.json({ error: "القائمة غير موجودة" }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "JSON غير صالح" }, { status: 400 }); }
  const checked = editSchema.safeParse(body);
  if (!checked.success) return NextResponse.json({ error: "تحقق من اسم القائمة والوصف" }, { status: 400 });
  try {
    const found = await prisma.communicationAudienceList.findFirst({
      where: { id, type: "CUSTOM" }, select: { id: true },
    });
    if (!found) return NextResponse.json({ error: "القائمة غير موجودة" }, { status: 404 });
    const actor = auditActorFromDashboardSession(session!);
    const result = await updateAudienceList(id, {
      name: checked.data.name, description: checked.data.description ?? null,
    }, actor);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("CRM list metadata update failed", error);
    return NextResponse.json({ error: "تعذر تعديل القائمة" }, { status: 500 });
  }
}
