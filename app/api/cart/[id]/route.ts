import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { writeAuditLog, auditActorFromDashboardSession } from "@/lib/audit-log";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ error: "Cart item not found" }, { status: 404 });

    const cartItem = await prisma.cartItem.findUnique({
      where: { id },
      include: { campaign: { select: { title: true } } },
    });
    if (!cartItem) {
      return NextResponse.json(
        { error: "Cart item not found" },
        { status: 404 }
      );
    }

    // The donor removes a line from their own cart. This used to require the dashboard's
    // revenue permission, so a donor's "remove" silently failed and the line stayed.
    if (cartItem.userId === session.user.id) {
      await prisma.cartItem.delete({ where: { id } });
      return NextResponse.json({ message: "Cart item deleted successfully" }, { status: 200 });
    }

    const denied = requireAdminOrDashboardPermission(session, "revenue");
    if (denied) return denied;

    await prisma.cartItem.delete({
      where: { id },
    });

    const actor = auditActorFromDashboardSession(session!);
    await writeAuditLog({
      ...actor,
      stream: "TEAM",
      action: "CART_ITEM_DELETE_ADMIN",
      messageAr: `${actor.actorName ?? "مسؤول"} حذف عنصرًا من سلة مستخدم («${cartItem.campaign?.title ?? cartItem.campaignId}»، مبلغ: ${cartItem.amount})`,
      entityType: "CartItem",
      entityId: id,
      metadata: { userId: cartItem.userId, campaignId: cartItem.campaignId },
    });

    const remainingCartItems = await prisma.cartItem.findMany({
      where: { userId: cartItem.userId },
      include: { campaign: { select: { id: true, title: true, images: true } } },
    });

    return NextResponse.json(
      { message: "Cart item deleted successfully", remainingCartItems },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting cart item:", error);
    return NextResponse.json(
      { error: "Failed to delete cart item" },
      { status: 500 }
    );
  }
}
