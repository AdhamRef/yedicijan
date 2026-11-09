import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { auditActorFromDashboardSession, queueAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { validateBannerInput } from "@/lib/content/yedicihan-urgent-banner";

type Ctx = { params: Promise<{ id: string }> };
const validId = (id: string) => /^[a-f\d]{24}$/i.test(id);
async function authorize() {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "campaigns");
  return { session, denied };
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { session, denied } = await authorize();
  if (denied) return denied;
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "البانر غير موجود" }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "JSON غير صالح" }, { status: 400 }); }
  if (typeof body !== "object" || body === null || Array.isArray(body) ||
      typeof (body as { isActive?: unknown }).isActive !== "boolean" ||
      Object.keys(body).length !== 1)
    return NextResponse.json({ error: "يسمح فقط بتحديث حالة البانر" }, { status: 400 });
  const isActive = (body as { isActive: boolean }).isActive;
  try {
    const banner = await prisma.urgentBanner.findUnique({ where: { id } });
    if (!banner) return NextResponse.json({ error: "البانر غير موجود" }, { status: 404 });
    if (isActive) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: banner.campaignId }, select: { isActive: true, isDeleted: true },
      });
      if (!campaign?.isActive || campaign.isDeleted === true)
        return NextResponse.json({ error: "لا يمكن تفعيل بانر مرتبط بمشروع غير نشط" }, { status: 409 });
      if (banner.endsAt && banner.endsAt <= new Date())
        return NextResponse.json({ error: "لا يمكن تفعيل بانر منتهي المدة" }, { status: 409 });
    }
    const updated = await prisma.urgentBanner.update({ where: { id }, data: { isActive } });
    const actor = auditActorFromDashboardSession(session!);
    queueAuditLog({ ...actor, action: "YEDICIHAN_URGENT_BANNER_STATUS",
      messageAr: "غيّر حالة بانر الطوارئ: " + banner.title + (isActive ? " (تفعيل)" : " (إيقاف)"),
      entityType: "UrgentBanner", entityId: id });
    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error("YediCihan urgent banner status change failed", error);
    return NextResponse.json({ error: "تعذر حفظ حالة البانر" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { session, denied } = await authorize();
  if (denied) return denied;
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "البانر غير موجود" }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "JSON غير صالح" }, { status: 400 }); }
  const result = validateBannerInput(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const b = result.value;
  try {
    const [old, campaign] = await Promise.all([
      prisma.urgentBanner.findUnique({ where: { id }, select: { id: true, title: true } }),
      prisma.campaign.findUnique({ where: { id: b.campaignId }, select: { isActive: true, isDeleted: true } }),
    ]);
    if (!old) return NextResponse.json({ error: "البانر غير موجود" }, { status: 404 });
    if (!campaign?.isActive || campaign.isDeleted === true)
      return NextResponse.json({ error: "اختر مشروعًا نشطًا" }, { status: 409 });
    const updated = await prisma.urgentBanner.update({
      where: { id },
      data: {
        title: b.title, description: b.description || null,
        ctaLabel: b.ctaLabel, imageUrl: b.imageUrl || null,
        campaignId: b.campaignId, priority: b.priority,
        startsAt: b.startsAt, endsAt: b.endsAt, locales: b.locales,
        translations: {
          deleteMany: {},
          create: Object.entries(b.translations).map(([locale, t]) => ({
            locale, title: t.title, description: t.description || null, ctaLabel: t.ctaLabel,
          })),
        },
      },
      include: { translations: true },
    });
    const actor = auditActorFromDashboardSession(session!);
    queueAuditLog({ ...actor, action: "YEDICIHAN_URGENT_BANNER_UPDATE",
      messageAr: "عدّل بانر الطوارئ: " + updated.title,
      entityType: "UrgentBanner", entityId: id });
    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error("YediCihan urgent banner edit failed", error);
    return NextResponse.json({ error: "تعذر تحديث البانر" }, { status: 500 });
  }
}
