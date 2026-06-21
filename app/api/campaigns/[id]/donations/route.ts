import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const recentDonations = await prisma.donation.findMany({
      where: {
        campaignId: id,
      },
      include: {
        donor: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    return NextResponse.json(recentDonations);
  } catch (error) {
    console.error("Error fetching recent donations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent donations" },
      { status: 500 }
    );
  }
}