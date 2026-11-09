import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { queueAuditLog, auditActorFromDashboardSession } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { validateBannerInput } from "@/lib/content/yedicihan-urgent-banner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "campaigns");
  if (denied) return denied;
  try {
    const items = await prisma.urgentBanner.findMany({
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take: 200,
      include: { translations: true },
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("YediCihan urgent banner admin list failed", error);
    return NextResponse.json({ error: "تعذر تحميل البنرات" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "campaigns");
  if (denied) return denied;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "JSON غير صالح" }, { status: 400 }); }
  const result = validateBannerInput(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const b = result.value;
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: b.campaignId }, select: { id: true, isActive: true, isDeleted: true },
    });
    if (!campaign || !campaign.isActive || campaign.isDeleted === true)
      return NextResponse.json({ error: "اختر مشروعًا نشطًا من يدي جيهان" }, { status: 400 });
    const item = await prisma.urgentBanner.create({
      data: {
        title: b.title,
        description: b.description || null,
        ctaLabel: b.ctaLabel,
        imageUrl: b.imageUrl || null,
        campaignId: b.campaignId,
        priority: b.priority,
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        locales: b.locales,
        isActive: false, // NEVER publish on creation.
        translations: {
          create: Object.entries(b.translations).map(([locale, value]) => ({
            locale, title: value.title,
            description: value.description || null, ctaLabel: value.ctaLabel,
          })),
        },
      },
      include: { translations: true },
    });
    const actor = auditActorFromDashboardSession(session!);
    queueAuditLog({ ...actor, action: "YEDICIHAN_URGENT_BANNER_CREATE",
      messageAr: "أنشأ بانرًا جديدًا غير مفعّل: " + item.title,
      entityType: "UrgentBanner", entityId: item.id });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("YediCihan urgent banner creation failed", error);
    return NextResponse.json({ error: "تعذر إنشاء البانر" }, { status: 500 });
  }
}
