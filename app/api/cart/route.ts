import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]/options";
import { CART_INCLUDE, cartDb, parseCartLine } from "@/lib/cart/server";

// Cart items of the signed-in user: project lines and category lines (zakat per country).
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const cartItems = await cartDb.findMany({ where: { userId: session.user.id }, include: CART_INCLUDE });
    return NextResponse.json(cartItems);
  } catch (error) {
    console.error("Error fetching cart items:", error);
    return NextResponse.json({ error: "Failed to fetch cart items" }, { status: 500 });
  }
}

// Add a line: a project (campaignId) or a category (categoryId).
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const parsed = parseCartLine(await request.json().catch(() => ({})));
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { line } = parsed;

    // The target must exist and be open.
    if (line.campaignId) {
      const c = await prisma.campaign.findUnique({ where: { id: line.campaignId }, select: { isActive: true } });
      if (!c?.isActive) return NextResponse.json({ error: "Campaign not available" }, { status: 404 });
    } else {
      const c = await prisma.category.findUnique({ where: { id: line.categoryId! }, select: { isActive: true } });
      if (!c || c.isActive === false) return NextResponse.json({ error: "Category not available" }, { status: 404 });
    }

    const newCartItem = await cartDb.create({ data: { ...line, userId: session.user.id }, include: CART_INCLUDE });
    return NextResponse.json(newCartItem, { status: 201 });
  } catch (error) {
    console.error("Error adding item to cart:", error);
    return NextResponse.json({ error: "Failed to add item to cart" }, { status: 500 });
  }
}
