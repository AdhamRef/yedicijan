import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { writeAuditLog, auditActorFromDashboardSession } from "@/lib/audit-log";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "campaigns");
    if (denied) return denied;

    const body = await req.json();
    const { campaigns } = body;

    if (!Array.isArray(campaigns)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      campaigns.map(({ id, order }: { id: string; order: number }) =>
        prisma.campaign.update({
          where: { id },
          data: { priority: order },
        })
      )
    );

    const actor = auditActorFromDashboardSession(session!);
    await writeAuditLog({
      ...actor,
      action: "CAMPAIGN_REORDER",
      messageAr: `${actor.actorName ?? "مسؤول"} أعاد ترتيب أولويات المشاريع (${campaigns.length} مشروع)`,
      entityType: "Campaign",
      metadata: { count: campaigns.length },
    });

    return NextResponse.json(
      { message: "Campaigns reordered successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error reordering campaigns:", error);
    return NextResponse.json(
      { error: "Failed to reorder campaigns" },
      { status: 500 }
    );
  }
}
