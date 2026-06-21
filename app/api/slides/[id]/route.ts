import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from "../../auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { writeAuditLog, auditActorFromDashboardSession } from "@/lib/audit-log";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const locale = request.nextUrl.searchParams.get('locale') || 'ar';
    const allTranslations = request.nextUrl.searchParams.get('allTranslations') === 'true';
    const slide = await prisma.slide.findUnique({
      where: { id },
      select: {
        id: true, title: true, description: true, image: true,
        showButton: true, buttonText: true, buttonLink: true, isActive: true, order: true,
        translations: { select: { locale: true, title: true, description: true, buttonText: true } },
      },
    });
    if (!slide) return NextResponse.json({ error: 'Slide not found' }, { status: 404 });
    if (allTranslations) return NextResponse.json(slide);
    const t = slide.translations.find(tr => tr.locale === locale);
    return NextResponse.json({
      ...slide,
      title: t?.title ?? slide.title,
      description: t?.description ?? slide.description,
      buttonText: t?.buttonText ?? slide.buttonText,
    });
  } catch (error) {
    console.error('Error fetching slide:', error);
    return NextResponse.json({ error: 'Failed to fetch slide' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, 'slides');
    if (denied) return denied;
    const body = await request.json();
    const { title, description, image, showButton, buttonText, buttonLink, isActive, order, translations } = body;
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      await tx.slide.update({
        where: { id },
        data: {
          title,
          description: description ?? '',
          image: image ?? '',
          showButton: showButton ?? true,
          buttonText: buttonText ?? '',
          buttonLink: buttonLink ?? '',
          isActive: isActive !== false,
          order: order ?? 0,
        },
      });
      if (translations && typeof translations === 'object') {
        for (const [locale, t] of Object.entries(translations)) {
          if (locale === 'ar' || !t || typeof t !== 'object') continue;
          const tt = t as any;
          if (!tt.title) continue;
          await tx.slideTranslation.upsert({
            where: { slideId_locale: { slideId: id, locale } },
            update: { title: tt.title, description: tt.description ?? '', buttonText: tt.buttonText ?? '' },
            create: { slideId: id, locale, title: tt.title, description: tt.description ?? '', buttonText: tt.buttonText ?? '' },
          });
        }
      }
    });

    const full = await prisma.slide.findUnique({
      where: { id },
      select: { id: true, title: true, description: true, image: true, showButton: true, buttonText: true, buttonLink: true, isActive: true, order: true, translations: { select: { locale: true, title: true, description: true, buttonText: true } } },
    });

    const actor = auditActorFromDashboardSession(session!);
    await writeAuditLog({
      ...actor,
      action: "SLIDE_UPDATE",
      messageAr: `${actor.actorName ?? "مسؤول"} عدّل شريحة الهيرو: ${full?.title ?? title}`,
      entityType: "Slide",
      entityId: id,
    });

    return NextResponse.json(full);
  } catch (error) {
    console.error('Error updating slide:', error);
    return NextResponse.json({ error: 'Failed to update slide' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, 'slides');
    if (denied) return denied;
    const existing = await prisma.slide.findUnique({
      where: { id },
      select: { title: true },
    });
    await prisma.slide.delete({ where: { id } });

    const actor = auditActorFromDashboardSession(session!);
    await writeAuditLog({
      ...actor,
      action: "SLIDE_DELETE",
      messageAr: `${actor.actorName ?? "مسؤول"} حذف شريحة الهيرو: ${existing?.title ?? id}`,
      entityType: "Slide",
      entityId: id,
    });

    return NextResponse.json({ message: 'Slide deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting slide:', error);
    return NextResponse.json({ error: 'Failed to delete slide' }, { status: 500 });
  }
}
