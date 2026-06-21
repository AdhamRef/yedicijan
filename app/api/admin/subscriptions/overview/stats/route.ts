import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentCalendarMonthUtcRange } from "@/lib/admin/current-calendar-month-utc";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import {
  PAID_DONATION_FILTER,
  donationRowUsdApprox,
  donationUsdSumFallback,
} from "@/lib/dashboard/donation-usd-revenue";
import { istanbulDateKeysToUtcRange } from "@/lib/admin/istanbul-calendar";

function getDateRange(period: string, startParam?: string | null, endParam?: string | null) {
  let endDate: Date;
  let startDate: Date;
  if (startParam && endParam) {
    ({ startDate, endDate } = istanbulDateKeysToUtcRange(startParam, endParam));
  } else if (period === "all") {
    endDate = new Date();
    startDate = new Date(endDate);
    startDate.setFullYear(startDate.getFullYear() - 10);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);
  } else {
    endDate = endParam ? new Date(endParam + "T23:59:59.999Z") : new Date();
    startDate = new Date(endDate);
    const days = period === "day" ? 1 : period === "week" ? 7 : 30;
    startDate.setUTCDate(startDate.getUTCDate() - days);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);
  }
  return { startDate, endDate };
}

/** Subscription-linked donation charges in range (any status — for counts & table) */
function buildDonationChargeBase(
  startDate: Date,
  endDate: Date,
  categoryId: string | null,
  campaignId: string | null,
  referralId: string | null
): Prisma.DonationWhereInput {
  const base: Prisma.DonationWhereInput = {
    subscriptionId: { not: null },
    createdAt: { gte: startDate, lte: endDate },
  };
  if (referralId) base.referralId = referralId;
  if (campaignId && campaignId !== "all") {
    base.items = { some: { campaignId } };
  } else if (categoryId && categoryId !== "all") {
    base.OR = [
      { items: { some: { campaign: { categoryIds: { has: categoryId } } } } },
      { categoryItems: { some: { categoryId } } },
    ];
  }
  return base;
}

function buildDonationChargeAllTimeBase(
  categoryId: string | null,
  campaignId: string | null,
  referralId: string | null
): Prisma.DonationWhereInput {
  const base: Prisma.DonationWhereInput = { subscriptionId: { not: null } };
  if (referralId) base.referralId = referralId;
  if (campaignId && campaignId !== "all") {
    base.items = { some: { campaignId } };
  } else if (categoryId && categoryId !== "all") {
    base.OR = [
      { items: { some: { campaign: { categoryIds: { has: categoryId } } } } },
      { categoryItems: { some: { categoryId } } },
    ];
  }
  return base;
}

function buildSubscriptionWhere(
  categoryId: string | null,
  campaignId: string | null,
  referralId: string | null
): Prisma.SubscriptionWhereInput {
  const campaignCat: Prisma.SubscriptionWhereInput = {};
  if (campaignId && campaignId !== "all") {
    campaignCat.items = { some: { campaignId } };
  } else if (categoryId && categoryId !== "all") {
    campaignCat.OR = [
      { items: { some: { campaign: { categoryIds: { has: categoryId } } } } },
      { categoryItems: { some: { categoryId } } },
    ];
  }
  if (referralId && Object.keys(campaignCat).length > 0) {
    return { AND: [{ referralId }, campaignCat] };
  }
  if (referralId) return { referralId };
  return campaignCat;
}

function buildDonationItemWhereSub(
  startDate: Date,
  endDate: Date,
  categoryId: string | null,
  campaignId: string | null,
  referralId: string | null
): Prisma.DonationItemWhereInput {
  const donation: Prisma.DonationWhereInput = {
    subscriptionId: { not: null },
    createdAt: { gte: startDate, lte: endDate },
    ...PAID_DONATION_FILTER,
  };
  if (referralId) donation.referralId = referralId;
  if (campaignId && campaignId !== "all") {
    donation.items = { some: { campaignId } };
  } else if (categoryId && categoryId !== "all") {
    donation.OR = [
      { items: { some: { campaign: { categoryIds: { has: categoryId } } } } },
      { categoryItems: { some: { categoryId } } },
    ];
  }
  if (campaignId && campaignId !== "all") {
    return { donation, campaignId };
  }
  if (categoryId && categoryId !== "all") {
    return { donation, campaign: { categoryIds: { has: categoryId } } };
  }
  return { donation };
}

function buildDonationCategoryItemWhereSub(
  startDate: Date,
  endDate: Date,
  categoryId: string | null,
  referralId: string | null
): Prisma.DonationCategoryItemWhereInput {
  const donation: Prisma.DonationWhereInput = {
    subscriptionId: { not: null },
    createdAt: { gte: startDate, lte: endDate },
    ...PAID_DONATION_FILTER,
  };
  if (referralId) donation.referralId = referralId;
  if (categoryId && categoryId !== "all") {
    donation.OR = [
      { items: { some: { campaign: { categoryIds: { has: categoryId } } } } },
      { categoryItems: { some: { categoryId } } },
    ];
    return { donation, categoryId };
  }
  return { donation };
}

/** GET /api/admin/subscriptions/overview/stats — monthly subscriptions + donations from subscriptions */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "monthly");
    if (denied) return denied;

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "all";
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const categoryId = searchParams.get("categoryId");
    const campaignId = searchParams.get("campaignId");
    const referralIdParam = searchParams.get("referralId");

    let referralId: string | null = null;
    if (referralIdParam) {
      const ref = await prisma.referral.findUnique({
        where: { id: referralIdParam },
        select: { id: true },
      });
      if (!ref) {
        return NextResponse.json({ error: "Referral not found" }, { status: 404 });
      }
      referralId = ref.id;
    }

    const { startDate, endDate } = getDateRange(period, startParam, endParam);
    const subBase = buildSubscriptionWhere(categoryId, campaignId, referralId);
    // ACTIVE subscription without any settled charge isn't really earning revenue —
    // exclude it from MRR / "التبرعات الشهرية الناشطة" so a failed-only sub doesn't inflate the totals.
    const activeMonthlyWhere: Prisma.SubscriptionWhereInput = {
      ...subBase,
      status: "ACTIVE",
      donations: { some: PAID_DONATION_FILTER },
    };
    const donationChargeBase = buildDonationChargeBase(startDate, endDate, categoryId, campaignId, referralId);
    // status=PAID alone includes abandoned checkouts that never settled; require paidAt too.
    const donationPaidWhere = { ...donationChargeBase, ...PAID_DONATION_FILTER };
    const donationFailedWhere = { ...donationChargeBase, status: "FAILED" as const };
    const donationAllTimeBase = buildDonationChargeAllTimeBase(categoryId, campaignId, referralId);
    const donationPaidAllTime = { ...donationAllTimeBase, ...PAID_DONATION_FILTER };

    const { monthStart, monthEnd } = getCurrentCalendarMonthUtcRange();
    const thisMonthBase = buildDonationChargeBase(
      monthStart,
      monthEnd,
      categoryId,
      campaignId,
      referralId
    );
    const thisMonthPaid = { ...thisMonthBase, ...PAID_DONATION_FILTER };

    const [
      totalCampaigns,
      totalCategories,
      totalUsers,
      totalDonations,
      paidDonationCount,
      failedDonationCount,
      totalAmountResult,
      thisMonthTotalResult,
      allTimeRevenueResult,
      failedTotalResult,
      campaignDonationsSum,
      categoryDonationsSum,
      recentDonations,
      activeSubscriptionCount,
      pausedSubscriptionCount,
      cancelledSubscriptionCount,
      monthlyRecurringRevenueResult,
      pausedAmountResult,
      cancelledAmountResult,
      newSubscriptionsInPeriod,
      totalSubscriptionsMatching,
    ] = await Promise.all([
      prisma.campaign.count(),
      prisma.category.count(),
      prisma.user.count(),
      prisma.donation.count({ where: donationChargeBase }),
      prisma.donation.count({ where: donationPaidWhere }),
      prisma.donation.count({ where: donationFailedWhere }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: donationPaidWhere,
      }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: thisMonthPaid,
      }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: donationPaidAllTime,
      }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: donationFailedWhere,
      }),
      prisma.donationItem.aggregate({
        _sum: { amountUSD: true, amount: true },
        _count: { id: true },
        where: buildDonationItemWhereSub(startDate, endDate, categoryId, campaignId, referralId),
      }),
      prisma.donationCategoryItem.aggregate({
        _sum: { amountUSD: true, amount: true },
        _count: { id: true },
        where: buildDonationCategoryItemWhereSub(startDate, endDate, categoryId, referralId),
      }),
      prisma.donation.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        where: donationChargeBase,
        select: {
          id: true,
          amount: true,
          totalAmount: true,
          amountUSD: true,
          createdAt: true,
          currency: true,
          subscriptionId: true,
          status: true,
          donor: { select: { name: true } },
          items: { select: { campaign: { select: { title: true } } } },
          categoryItems: { select: { category: { select: { name: true } } } },
        },
      }),
      prisma.subscription.count({ where: activeMonthlyWhere }),
      prisma.subscription.count({ where: { ...subBase, status: "PAUSED" } }),
      prisma.subscription.count({ where: { ...subBase, status: "CANCELLED" } }),
      prisma.subscription.aggregate({
        _sum: { amountUSD: true },
        where: activeMonthlyWhere,
      }),
      prisma.subscription.aggregate({
        _sum: { amountUSD: true },
        where: { ...subBase, status: "PAUSED" },
      }),
      prisma.subscription.aggregate({
        _sum: { amountUSD: true },
        where: { ...subBase, status: "CANCELLED" },
      }),
      prisma.subscription.count({
        where: { ...subBase, createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.subscription.count({ where: subBase }),
    ]);

    let totalAmount = totalAmountResult._sum?.amountUSD ?? 0;
    if (totalAmount === 0 && paidDonationCount > 0) {
      totalAmount = await donationUsdSumFallback(donationPaidWhere);
    }
    let thisMonthRevenue = thisMonthTotalResult._sum?.amountUSD ?? 0;
    if (thisMonthRevenue === 0) {
      const paidThisMonth = await prisma.donation.count({ where: thisMonthPaid });
      if (paidThisMonth > 0) {
        thisMonthRevenue = await donationUsdSumFallback(thisMonthPaid);
      }
    }
    let allTimeRevenue = allTimeRevenueResult._sum?.amountUSD ?? 0;
    if (allTimeRevenue === 0) {
      const allTimePaidCount = await prisma.donation.count({ where: donationPaidAllTime });
      if (allTimePaidCount > 0) {
        allTimeRevenue = await donationUsdSumFallback(donationPaidAllTime);
      }
    }
    const monthlyRecurringRevenue = monthlyRecurringRevenueResult._sum?.amountUSD ?? 0;
    const activeMonthlyAmountUSD = monthlyRecurringRevenue;
    const pausedSubscriptionAmountUSD = pausedAmountResult._sum?.amountUSD ?? 0;
    const cancelledSubscriptionAmountUSD = cancelledAmountResult._sum?.amountUSD ?? 0;
    const monthlyStoppedAmountUSD = pausedSubscriptionAmountUSD + cancelledSubscriptionAmountUSD;

    const campaignDonationsTotal =
      campaignDonationsSum._sum?.amountUSD ?? campaignDonationsSum._sum?.amount ?? 0;
    const categoryDonationsTotal =
      categoryDonationsSum._sum?.amountUSD ?? categoryDonationsSum._sum?.amount ?? 0;
    const campaignDonationsCount = campaignDonationsSum._count?.id ?? 0;
    const categoryDonationsCount = categoryDonationsSum._count?.id ?? 0;

    const donationsForSupportFees = await prisma.donation.findMany({
      where: donationPaidWhere,
      select: { amountUSD: true, amount: true, currency: true, totalAmount: true, teamSupport: true, fees: true },
      take: 100000,
    });
    const toUSD = (
      rows: {
        amountUSD: number | null;
        amount: number;
        currency: string;
        totalAmount: number;
        teamSupport?: number | null;
        fees?: number | null;
      }[]
    ) =>
      rows.reduce(
        (acc, r) => {
          const usd = donationRowUsdApprox(r);
          const total = r.totalAmount || 1;
          acc.teamSupport += usd * ((r.teamSupport ?? 0) / total);
          acc.fees += usd * ((r.fees ?? 0) / total);
          return acc;
        },
        { teamSupport: 0, fees: 0 }
      );
    const { teamSupport: teamSupportTotal, fees: feesTotal } = toUSD(donationsForSupportFees);

    const recentDonationsList = Array.isArray(recentDonations) ? recentDonations : [];
    const recentDonationsFormatted = recentDonationsList.map((d) => ({
      id: d.id,
      amount: d.totalAmount ?? d.amount ?? 0,
      currency: d.currency ?? "USD",
      donorName: d.donor?.name ?? "—",
      type: "MONTHLY" as const,
      status: d.status,
      campaignTitle: d.items?.[0]?.campaign?.title ?? null,
      categoryName: d.categoryItems?.[0]?.category?.name ?? null,
      createdAt: d.createdAt,
    }));

    const failedTotalAmount = failedTotalResult._sum?.amountUSD ?? 0;

    /** All successful subscription charges ever — ignores category/campaign/referral filters */
    const globalSubPaidWhere = { subscriptionId: { not: null }, ...PAID_DONATION_FILTER };
    let paidRevenueAllTimeUnfiltered =
      (await prisma.donation.aggregate({ _sum: { amountUSD: true }, where: globalSubPaidWhere }))._sum
        ?.amountUSD ?? 0;
    if (paidRevenueAllTimeUnfiltered === 0) {
      const n = await prisma.donation.count({ where: globalSubPaidWhere });
      if (n > 0) paidRevenueAllTimeUnfiltered = await donationUsdSumFallback(globalSubPaidWhere);
    }

    return NextResponse.json({
      totalCampaigns,
      totalCategories,
      totalUsers,
      totalDonations,
      paidCount: paidDonationCount,
      failedCount: failedDonationCount,
      failedTotalAmount,
      totalAmount,
      allTimeRevenue,
      paidRevenueAllTimeUnfiltered,
      thisMonthRevenue,
      monthlyRecurringRevenue,
      activeMonthlyAmountUSD,
      monthlyStoppedAmountUSD,
      pausedSubscriptionAmountUSD,
      cancelledSubscriptionAmountUSD,
      activeMonthlyCount: activeSubscriptionCount,
      pausedSubscriptionCount,
      cancelledSubscriptionCount,
      monthlyStoppedCount: pausedSubscriptionCount + cancelledSubscriptionCount,
      newSubscriptionsInPeriod,
      totalSubscriptionsMatching,
      monthlyCount: paidDonationCount,
      oneTimeCount: 0,
      oneTimeTotalAmount: 0,
      monthlyTotalAmount: totalAmount,
      campaignDonationsTotal,
      categoryDonationsTotal,
      campaignDonationsCount,
      categoryDonationsCount,
      teamSupportTotal,
      feesTotal,
      recentDonations: recentDonationsFormatted,
    });
  } catch (error) {
    console.error("Error fetching subscription stats:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch subscription statistics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
