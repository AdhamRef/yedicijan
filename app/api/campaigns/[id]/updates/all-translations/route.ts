// app/api/campaigns/[id]/updates/all-translations/route.ts
// Endpoint to fetch all updates with ALL their translations (for editing purposes)
// GET /api/campaigns/[id]/updates/all-translations

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // ✅ Fetch all updates with ALL translations
    const updates = await prisma.update.findMany({
      where: {
        campaignId: id,
      },
      select: {
        id: true,
        title: true,        // Arabic default
        description: true,  // Arabic default
        image: true,
        videoUrl: true,
        createdAt: true,
        
        // Fetch ALL translations (not filtered by locale)
        translations: {
          select: {
            locale: true,
            title: true,
            description: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(updates, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
    
  } catch (error) {
    console.error("Error fetching updates with translations:", error);
    return NextResponse.json(
      { error: "Failed to fetch updates" },
      { status: 500 }
    );
  }
}