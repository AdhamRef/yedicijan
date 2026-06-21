import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseIncludeInactive } from "@/lib/campaign/include-inactive-query";
import { NOT_SOFT_DELETED } from "@/lib/campaign/soft-delete-filter";

export async function GET(request: NextRequest) {
  try {
    const includeInactive = parseIncludeInactive(request.nextUrl.searchParams);

    const prioritizedCampaigns = await prisma.campaign.findMany({
      where: {
        AND: [
          { priority: { not: null } },
          includeInactive ? {} : { isActive: true },
          NOT_SOFT_DELETED,
        ].filter((c) => Object.keys(c).length > 0),
      },
      orderBy: { priority: "asc" }, // Order by priority
      include: {
        categories: {
          select: {
            id: true,
            slug: true,
            name: true,
            icon: true,
          },
        },
      },
    });

    // Map to add donation count to each campaign using prisma.count and surface
    // the first category in the legacy `category` slot for old consumers.
    const campaignsWithDonationCount = await Promise.all(prioritizedCampaigns.map(async (campaign) => {
      const donationCount = await prisma.donationItem.count({
        where: {
          campaignId: campaign.id, // Assuming there's a campaignId in the donationItem table
        },
      });
      return {
        ...campaign,
        category: campaign.categories?.[0] ?? null,
        donationCount, // Add the donation count
      };
    }));

    return NextResponse.json(campaignsWithDonationCount || []);
  } catch (error) {
    console.error("Error fetching prioritized campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch prioritized campaigns. Please try again later." },
      { status: 500 }
    );
  }
} 