import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { auditActorFromDashboardSession } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import {
  createAudienceList,
  addDonorMembers,
  listAudienceLists,
  AUDIENCE_LIST_PREFIX,
} from "@/lib/communication/audience-list-service";
import { validateDonorSelection } from "@/lib/communication/donor-segment-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** CRM only: no delivery operations, no payments and no changes to donor records. */
export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "donors");
  if (denied) return denied;
  try {
    const lists = (await listAudienceLists()).filter((item) => item.type === "CUSTOM");
    return NextResponse.json({ ok: true, lists });
  } catch (error) {
    console.error("CRM donor segment listing failed", error);
    return NextResponse.json({ ok: false, error: "تعذر تحميل القوائم" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "donors");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON غير صالح" }, { status: 400 });
  }
  const validation = validateDonorSelection(body);
  if (!validation.ok) return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });

  const { name, description, channel, donorIds } = validation.value;
  try {
    const donors = await prisma.user.findMany({
      where: { id: { in: donorIds }, role: "DONOR" },
      select: { id: true },
    });
    if (donors.length !== donorIds.length) {
      return NextResponse.json(
        { ok: false, error: "تتضمن القائمة معرفات غير صالحة أو حسابات ليست لمتبرعين" },
        { status: 400 },
      );
    }

    const actor = auditActorFromDashboardSession(session!);
    const created = await createAudienceList({
      name, description, type: "CUSTOM", channels: [channel],
    }, actor);
    if (!created.ok) {
      return NextResponse.json({ ok: false, error: created.error }, { status: created.status });
    }
    const added = await addDonorMembers(created.data.id, donorIds, actor);
    if (!added.ok) {
      // Fail closed: list is saved but NOT ready for use until member import
      // is reconciled. Never pretend that contacts were added.
      await prisma.communicationAudienceList.update({
        where: { id: created.data.id },
        data: { status: "ARCHIVED" },
      }).catch(() => null);
      return NextResponse.json(
        { ok: false, error: "تعذر إضافة المتبرعين؛ أُرشفت القائمة غير المكتملة", listId: created.data.id },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      listId: created.data.id,
      added: added.data.added,
      segmentKey: AUDIENCE_LIST_PREFIX + created.data.id,
    }, { status: 201 });
  } catch (error) {
    console.error("CRM donor segment create failed", error);
    return NextResponse.json({ ok: false, error: "تعذر إنشاء قائمة المتبرعين" }, { status: 500 });
  }
}
