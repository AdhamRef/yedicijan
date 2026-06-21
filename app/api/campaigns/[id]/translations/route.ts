// app/api/campaigns/[id]/translations/route.ts
// Endpoint to fetch all translations for a campaign (for editing purposes)
// GET /api/campaigns/[id]/translations - Returns all translations (en, fr, etc.)

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/options";
import { whereByIdOrLocaleSlug } from "@/lib/slug";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idOrSlug } = await params;

    // Resolve param (id, base slug, or per-locale translation slug) to the real campaign id.
    // We don't know which locale the slug came from when this route is hit, so probe each
    // supported locale until we find a match.
    const url = new URL(request.url);
    const hintLocale = url.searchParams.get("locale") || "ar";
    const probeLocales = [hintLocale, "en", "ar", "fr", "tr", "id", "pt", "es"];
    let camp: { id: string } | null = null;
    for (const loc of probeLocales) {
      camp = await prisma.campaign.findFirst({
        where: whereByIdOrLocaleSlug(idOrSlug, loc),
        select: { id: true },
      });
      if (camp) break;
    }
    if (!camp) return NextResponse.json([]);

    // ✅ Fetch all translations for the campaign (including per-locale slug for editing)
    const translations = await prisma.campaignTranslation.findMany({
      where: {
        campaignId: camp.id,
      },
      select: {
        locale: true,
        title: true,
        description: true,
        image: true,
        videoUrl: true,
        slug: true,
      },
    });

    return NextResponse.json(translations);
    
  } catch (error) {
    console.error("Error fetching campaign translations:", error);
    return NextResponse.json(
      { error: "Failed to fetch translations" },
      { status: 500 }
    );
  }
}