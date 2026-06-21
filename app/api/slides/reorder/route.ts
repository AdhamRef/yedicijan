import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/options';
import { requireAdminOrDashboardPermission } from '@/lib/dashboard/api-auth';
import { writeAuditLog, auditActorFromDashboardSession } from '@/lib/audit-log';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, 'slides');
    if (denied) return denied;
    const body = await req.json();
    const { slides } = body;
    if (!Array.isArray(slides)) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    await prisma.$transaction(slides.map(({ id, order }: { id: string; order: number }) => prisma.slide.update({ where: { id }, data: { order } })));

    const actor = auditActorFromDashboardSession(session!);
    await writeAuditLog({
      ...actor,
      action: "SLIDE_REORDER",
      messageAr: `${actor.actorName ?? "مسؤول"} أعاد ترتيب شرائح الهيرو (${slides.length} شريحة)`,
      entityType: "Slide",
      metadata: { count: slides.length },
    });

    return NextResponse.json({ message: 'Slides reordered' }, { status: 200 });
  } catch (error) {
    console.error('Error reordering slides:', error);
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
  }
}
