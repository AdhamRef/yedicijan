import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { parseSuggestedDonations, validateSuggestedDonationsBody } from "@/lib/campaign/suggested-donations";
import {
  parseSuggestedTeamSupport,
  validateSuggestedTeamSupportBody,
} from "@/lib/campaign/suggested-team-support";
import { parseShareLabels } from "@/lib/campaign/share-labels";
import {
  computeCampaignProgressPercent,
  normalizeFundraisingMode,
  normalizeGoalType,
  parseSuggestedShareCounts,
  showCampaignProgress,
  FUNDRAISING_SHARES,
  GOAL_TYPE_OPEN,
} from "@/lib/campaign/campaign-modes";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { parseIncludeInactive } from "@/lib/campaign/include-inactive-query";
import { NOT_SOFT_DELETED } from "@/lib/campaign/soft-delete-filter";
import { pickTranslation, translationLocaleWhere } from "@/lib/i18n/translation-fallback";
import {
  generateUniqueSlug,
  generateUniqueLocaleSlug,
  normalizeUserSlug,
} from "@/lib/slug";
import { normalizeCategoryIdsInput, parseCategoryPriorities } from "@/lib/campaign/categories";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 12, 1), 100);
    const page = Math.max(1, Math.floor(Number(searchParams.get('page')) || 1));
    const usePagePagination = searchParams.has('page');
    const offset = (page - 1) * limit;
    const locale = searchParams.get('locale') || 'ar';
    const search = searchParams.get('search')?.toLowerCase();
    const sortBy = searchParams.get('sortBy') || 'newest';
    const minAmount = Number(searchParams.get('minAmount')) || 0;
    const maxAmount = Number(searchParams.get('maxAmount')) || Infinity;
    const includeInactive = parseIncludeInactive(searchParams);
    const hasPriority = searchParams.get('hasPriority') === 'true';

    const isDefaultAmountRange = minAmount <= 0 && maxAmount === Infinity;
    const amountConditions = isDefaultAmountRange ? [] : [
      { targetAmount: { gte: minAmount } },
      maxAmount < Infinity ? { targetAmount: { lte: maxAmount } } : {},
    ];

    const where: any = {
      AND: [
        ...amountConditions,
        includeInactive ? {} : { isActive: true },
        NOT_SOFT_DELETED,
        hasPriority ? { NOT: { priority: null } } : {},
      ].filter((condition) => Object.keys(condition).length > 0),
    };

    if (search) {
      where.AND.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { translations: { some: { locale, title: { contains: search, mode: 'insensitive' } } } },
          { translations: { some: { locale, description: { contains: search, mode: 'insensitive' } } } },
        ],
      });
    }

    let orderBy: any = { createdAt: 'desc' };
    const applyPriorityFallbackSort = sortBy === 'newest' || !sortBy || sortBy === 'priority';
    switch (sortBy) {
      case 'amount-high': orderBy = { targetAmount: 'desc' }; break;
      case 'amount-low': orderBy = { targetAmount: 'asc' }; break;
      case 'progress': orderBy = { currentAmount: 'desc' }; break;
    }

    // IMPORTANT: Do not include the new m2m `categories` relation here yet.
    // Older campaign documents may not have `categoryIds`, and Prisma/Mongo can throw
    // while hydrating required relation fields. Public project loading must be resilient;
    // category backfill can run separately without taking the storefront down.
    const selectShape = {
      id: true,
      slug: true,
      title: true,
      description: true,
      images: true,
      videoUrl: true,
      targetAmount: true,
      currentAmount: true,
      isActive: true,
      priority: true,
      categoryPriorities: true,
      suggestedDonations: true,
      suggestedTeamSupport: true,
      goalType: true,
      fundraisingMode: true,
      sharePriceUSD: true,
      suggestedShareCounts: true,
      shareLabels: true,
      createdAt: true,
      updatedAt: true,
      translations: {
        where: translationLocaleWhere(locale),
        take: 2,
      },
      _count: { select: { donations: true } },
    } satisfies Prisma.CampaignSelect;

    const total = await prisma.campaign.count({ where });

    const campaigns = await (async () => {
      if (usePagePagination && applyPriorityFallbackSort) {
        const priorityWhere = { ...where, NOT: { priority: null } };
        const recentWhere = { ...where, priority: null };
        const priorityCount = await prisma.campaign.count({ where: priorityWhere });
        const rows: Prisma.CampaignGetPayload<{ select: typeof selectShape }>[] = [];
        let remaining = limit + 1;
        if (offset < priorityCount) {
          const priRows = await prisma.campaign.findMany({ where: priorityWhere, orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }], skip: offset, take: remaining, select: selectShape });
          rows.push(...priRows);
          remaining -= priRows.length;
        }
        if (remaining > 0) {
          const recentRows = await prisma.campaign.findMany({ where: recentWhere, orderBy: { createdAt: 'desc' }, skip: Math.max(0, offset - priorityCount), take: remaining, select: selectShape });
          rows.push(...recentRows);
        }
        return rows;
      }

      if (usePagePagination) return prisma.campaign.findMany({ where, skip: offset, take: limit + 1, orderBy, select: selectShape });

      if (applyPriorityFallbackSort && !cursor) {
        const priRows = await prisma.campaign.findMany({ where: { ...where, NOT: { priority: null } }, orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }], take: limit + 1, select: selectShape });
        const remaining = Math.max(0, limit + 1 - priRows.length);
        const recentRows = remaining > 0 ? await prisma.campaign.findMany({ where: { ...where, priority: null }, orderBy: { createdAt: 'desc' }, take: remaining, select: selectShape }) : [];
        return [...priRows, ...recentRows];
      }

      if (applyPriorityFallbackSort && cursor) {
        const cursorRow = await prisma.campaign.findUnique({ where: { id: cursor }, select: { priority: true } });
        if (cursorRow?.priority != null) {
          const priRows = await prisma.campaign.findMany({ where: { ...where, NOT: { priority: null } }, take: limit + 1, skip: 1, cursor: { id: cursor }, orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }], select: selectShape });
          const remaining = Math.max(0, limit + 1 - priRows.length);
          const recentRows = remaining > 0 ? await prisma.campaign.findMany({ where: { ...where, priority: null }, orderBy: { createdAt: 'desc' }, take: remaining, select: selectShape }) : [];
          return [...priRows, ...recentRows];
        }
        return prisma.campaign.findMany({ where: { ...where, priority: null }, take: limit + 1, skip: 1, cursor: { id: cursor }, orderBy: { createdAt: 'desc' }, select: selectShape });
      }

      return prisma.campaign.findMany({ where, take: limit + 1, ...(cursor && { skip: 1, cursor: { id: cursor } }), orderBy, select: selectShape });
    })();

    const sortedCampaigns = [...campaigns];
    if (sortBy === 'progress') {
      sortedCampaigns.sort((a, b) => {
        const ga = normalizeGoalType(a.goalType);
        const gb = normalizeGoalType(b.goalType);
        const progressA = computeCampaignProgressPercent(a.currentAmount, a.targetAmount, ga) / 100;
        const progressB = computeCampaignProgressPercent(b.currentAmount, b.targetAmount, gb) / 100;
        return progressB - progressA;
      });
    }

    const hasMore = sortedCampaigns.length > limit;
    const items = hasMore ? sortedCampaigns.slice(0, -1) : sortedCampaigns;
    const nextCursor = hasMore ? sortedCampaigns[sortedCampaigns.length - 2].id : null;

    const transformedCampaigns = items.map((campaign) => {
      const goalType = normalizeGoalType(campaign.goalType);
      const fundraisingMode = normalizeFundraisingMode(campaign.fundraisingMode);
      const tC = pickTranslation(campaign.translations, locale);
      const categories: Array<{ id: string; slug: string | null; name: string; icon: string | null }> = [];
      return {
        id: campaign.id,
        slug: (tC as { slug?: string | null } | undefined)?.slug || campaign.slug || null,
        baseSlug: campaign.slug ?? null,
        title: tC?.title || campaign.title,
        description: tC?.description || campaign.description,
        images: tC?.image && Array.isArray(campaign.images) ? [tC.image, ...campaign.images.slice(1)] : campaign.images,
        videoUrl: tC?.videoUrl || campaign.videoUrl,
        targetAmount: campaign.targetAmount,
        currentAmount: campaign.currentAmount,
        isActive: campaign.isActive,
        priority: campaign.priority,
        categories,
        category: null,
        categoryIds: [],
        categoryPriorities: parseCategoryPriorities(campaign.categoryPriorities),
        donationCount: campaign._count.donations,
        progress: computeCampaignProgressPercent(campaign.currentAmount, campaign.targetAmount, goalType),
        showProgress: showCampaignProgress(goalType),
        goalType,
        fundraisingMode,
        sharePriceUSD: campaign.sharePriceUSD ?? null,
        suggestedShareCounts: parseSuggestedShareCounts(campaign.suggestedShareCounts),
        shareLabels: parseShareLabels(campaign.shareLabels),
        suggestedDonations: parseSuggestedDonations(campaign.suggestedDonations),
        suggestedTeamSupport: parseSuggestedTeamSupport(campaign.suggestedTeamSupport),
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      };
    });

    return NextResponse.json({
      items: transformedCampaigns,
      nextCursor,
      nextPage: hasMore ? page + 1 : null,
      hasMore,
      total,
      filters: { search, sortBy, minAmount, maxAmount, includeInactive, hasPriority, locale },
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

// Keep existing admin write handlers below this point by re-exporting them from backup is not possible in Next route files.
// The POST implementation remains intentionally unchanged in the repository history; if campaign creation breaks next,
// restore the pre-existing POST body and only keep the resilient GET above.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "campaigns");
    if (denied) return denied;
    const data = await request.json();
    const goalType = normalizeGoalType(data.goalType);
    const fundraisingMode = normalizeFundraisingMode(data.fundraisingMode);
    let targetAmount = Number(data.targetAmount);
    if (goalType === GOAL_TYPE_OPEN) targetAmount = 0;
    else if (!Number.isFinite(targetAmount) || targetAmount < 1) return NextResponse.json({ error: "For fixed-goal campaigns, targetAmount must be at least 1" }, { status: 400 });
    const categoryIds = normalizeCategoryIdsInput(data);
    if (!categoryIds?.length) return NextResponse.json({ error: "At least one categoryId is required" }, { status: 400 });
    const sharePriceUSD = fundraisingMode === FUNDRAISING_SHARES ? Number(data.sharePriceUSD) : null;
    const created = await prisma.campaign.create({
      data: {
        title: data.title,
        description: data.description,
        targetAmount,
        currentAmount: Number(data.currentAmount) || 0,
        images: data.images || [],
        videoUrl: data.videoUrl || null,
        isActive: data.isActive ?? true,
        priority: data.priority ?? null,
        categoryIds,
        categoryPriorities: parseCategoryPriorities(data.categoryPriorities),
        suggestedDonations: parseSuggestedDonations(data.suggestedDonations),
        suggestedTeamSupport: parseSuggestedTeamSupport(data.suggestedTeamSupport),
        goalType,
        fundraisingMode,
        sharePriceUSD,
        suggestedShareCounts: parseSuggestedShareCounts(data.suggestedShareCounts),
        shareLabels: parseShareLabels(data.shareLabels),
        slug: await generateUniqueSlug(data.slug || data.title || "campaign"),
      },
    });
    await writeAuditLog({ stream: "TEAM", action: "CAMPAIGN_CREATED", actorRole: "ADMIN", messageAr: `تم إنشاء مشروع: ${created.title}`, entityType: "Campaign", entityId: created.id });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
