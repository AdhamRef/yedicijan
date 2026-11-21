import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentCalendarMonthIstanbulRange } from "@/lib/admin/current-calendar-month-utc";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import {
  PAID_DONATION_FILTER,
  donationRowUsdApprox,
  donationUsdSumFallback,
} from "@/lib/dashboard/donation-usd-revenue";
import { istanbulDateKeysToUtcRange } from "@/lib/admin/istanbul-calendar";
import { donationWhereAll } from "@/lib/donations/mongo-null";

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

/** GET /api/admin/referrals/[id]/stats - Stats for donations (transactions) attributed to this referral */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "referrals");
    if (denied) return denied;
    const { id: referralId } = await params;
    const referral = await prisma.referral.findUnique({
      where: { id: referralId },
      select: { id: true, code: true, name: true },
    });
    if (!referral) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "all";
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const categoryId = searchParams.get("categoryId");
    const campaignId = searchParams.get("campaignId");
    const country = searchParams.get("country")?.trim() ?? null;

    const { startDate, endDate } = getDateRange(period, startParam, endParam);
    const countryClause: Prisma.DonationWhereInput | null =
      country && country !== "all"
        ? country === "__unset"
          ? { OR: [{ donorCountryCode: null }, { donorCountryCode: "" }] }
          : { donorCountryCode: country.toUpperCase() }
        : null;
    const withCountry = (w: Prisma.DonationWhereInput): Prisma.DonationWhereInput =>
      countryClause ? { AND: [w, countryClause] } : w;

    const baseDonationWhere: Prisma.DonationWhereInput = {
      referralId,
      createdAt: { gte: startDate, lte: endDate },
    };
    /** Same category/campaign filters as donationWhere, but no date — for all-time إيرادات card */
    const baseAllTimeDonationWhere: Prisma.DonationWhereInput = { referralId };
    if (campaignId && campaignId !== "all") {
      baseDonationWhere.items = { some: { campaignId } };
      baseAllTimeDonationWhere.items = { some: { campaignId } };
    } else if (categoryId && categoryId !== "all") {
      baseDonationWhere.OR = [
        { items: { some: { campaign: { categoryIds: { has: categoryId } } } } },
        { categoryItems: { some: { categoryId } } },
      ];
      baseAllTimeDonationWhere.OR = [
        { items: { some: { campaign: { categoryIds: { has: categoryId } } } } },
        { categoryItems: { some: { categoryId } } },
      ];
    }
    const donationWhere = withCountry(baseDonationWhere);
    const allTimeDonationWhere = withCountry(baseAllTimeDonationWhere);

    // status=PAID alone includes abandoned checkouts that never settled; require paidAt too.
    // Composed with donationWhereAll, not spread: both sides can carry a top-level `OR`
    // (campaign/category scoping vs PAID_DONATION_FILTER) and spreading drops one silently.
    const paidDonationWhere: Prisma.DonationWhereInput = donationWhereAll(donationWhere, PAID_DONATION_FILTER);
    const failedDonationWhere: Prisma.DonationWhereInput = donationWhereAll(donationWhere, { status: "FAILED" });

    const { monthStart, monthEnd } = getCurrentCalendarMonthIstanbulRange();
    const thisMonthBaseWhere: Prisma.DonationWhereInput = {
      referralId,
      createdAt: { gte: monthStart, lte: monthEnd },
    };
    if (campaignId && campaignId !== "all") {
      thisMonthBaseWhere.items = { some: { campaignId } };
    } else if (categoryId && categoryId !== "all") {
      thisMonthBaseWhere.OR = [
        { items: { some: { campaign: { categoryIds: { has: categoryId } } } } },
        { categoryItems: { some: { categoryId } } },
      ];
    }
    const thisMonthDonationWhere = withCountry(thisMonthBaseWhere);
    const thisMonthPaidWhere: Prisma.DonationWhereInput = donationWhereAll(thisMonthDonationWhere, PAID_DONATION_FILTER);
    const allTimePaidWhere: Prisma.DonationWhereInput = donationWhereAll(allTimeDonationWhere, PAID_DONATION_FILTER);

    const [
      totalDonations,
      paidDonationCount,
      failedDonationCount,
      totalPaidResult,
      thisMonthTotalResult,
      allTimeRevenueResult,
      failedTotalResult,
      campaignDonationsSum,
      categoryDonationsSum,
      recentDonations,
    ] = await Promise.all([
      prisma.donation.count({ where: donationWhere }),
      prisma.donation.count({ where: paidDonationWhere }),
      prisma.donation.count({ where: failedDonationWhere }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: paidDonationWhere,
      }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: thisMonthPaidWhere,
      }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: allTimePaidWhere,
      }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: failedDonationWhere,
      }),
      prisma.donationItem.aggregate({
        _sum: { amountUSD: true, amount: true },
        _count: { id: true },
        where: { donation: paidDonationWhere },
      }),
      prisma.donationCategoryItem.aggregate({
        _sum: { amountUSD: true, amount: true },
        _count: { id: true },
        where: { donation: paidDonationWhere },
      }),
      prisma.donation.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        where: donationWhere,
        select: {
          id: true,
          amount: true,
          totalAmount: true,
          amountUSD: true,
          createdAt: true,
          currency: true,
          status: true,
          donor: { select: { name: true } },
          items: { select: { campaign: { select: { title: true } } } },
          categoryItems: { select: { category: { select: { name: true } } } },
        },
      }),
    ]);

    // Unified paid total — must match thisMonthRevenue / allTimeRevenue.
    let totalAmount = totalPaidResult._sum?.amountUSD ?? 0;
    if (totalAmount === 0 && paidDonationCount > 0) {
      totalAmount = await donationUsdSumFallback(paidDonationWhere);
    }

    let thisMonthRevenue = thisMonthTotalResult._sum?.amountUSD ?? 0;
    if (thisMonthRevenue === 0) {
      const paidThisMonth = await prisma.donation.count({ where: thisMonthPaidWhere });
      if (paidThisMonth > 0) {
        thisMonthRevenue = await donationUsdSumFallback(thisMonthPaidWhere);
      }
    }
    let allTimeRevenue = allTimeRevenueResult._sum?.amountUSD ?? 0;
    if (allTimeRevenue === 0) {
      const allTimePaidCount = await prisma.donation.count({ where: allTimePaidWhere });
      if (allTimePaidCount > 0) {
        allTimeRevenue = await donationUsdSumFallback(allTimePaidWhere);
      }
    }
    const campaignDonationsTotal = campaignDonationsSum._sum?.amountUSD ?? campaignDonationsSum._sum?.amount ?? 0;
    const categoryDonationsTotal = categoryDonationsSum._sum?.amountUSD ?? categoryDonationsSum._sum?.amount ?? 0;
    const campaignDonationsCount = campaignDonationsSum._count?.id ?? 0;
    const categoryDonationsCount = categoryDonationsSum._count?.id ?? 0;

    const donationsForSupportFees = await prisma.donation.findMany({
      where: paidDonationWhere,
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
          // See app/api/admin/stats/route.ts — `|| 1` made an unproratable row contribute
          // `usd * teamSupport` instead of its share. Skip such rows entirely.
          const total = Number(r.totalAmount) || 0;
          if (total > 0) {
            acc.teamSupport += usd * ((r.teamSupport ?? 0) / total);
            acc.fees += usd * ((r.fees ?? 0) / total);
          }
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
      status: d.status,
      campaignTitle: d.items?.[0]?.campaign?.title ?? null,
      categoryName: d.categoryItems?.[0]?.category?.name ?? null,
      createdAt: d.createdAt,
    }));

    const failedTotalAmount = failedTotalResult._sum?.amountUSD ?? 0;

    /** All-time successful revenue for this referral — ignores category/campaign filters */
    const referralAllTimePaidWhere: Prisma.DonationWhereInput = { referralId, ...PAID_DONATION_FILTER };
    let paidRevenueAllTimeUnfiltered =
      (await prisma.donation.aggregate({ _sum: { amountUSD: true }, where: referralAllTimePaidWhere }))._sum
        ?.amountUSD ?? 0;
    if (paidRevenueAllTimeUnfiltered === 0) {
      const n = await prisma.donation.count({ where: referralAllTimePaidWhere });
      if (n > 0) paidRevenueAllTimeUnfiltered = await donationUsdSumFallback(referralAllTimePaidWhere);
    }

    return NextResponse.json({
      referral: { id: referral.id, code: referral.code, name: referral.name },
      totalCampaigns: 0,
      totalCategories: 0,
      totalDonations,
      paidCount: paidDonationCount,
      failedCount: failedDonationCount,
      failedTotalAmount,
      totalUsers: 0,
      totalAmount,
      allTimeRevenue,
      paidRevenueAllTimeUnfiltered,
      thisMonthRevenue,
      campaignDonationsTotal,
      categoryDonationsTotal,
      campaignDonationsCount,
      categoryDonationsCount,
      teamSupportTotal,
      feesTotal,
      recentDonations: recentDonationsFormatted,
    });
  } catch (error) {
    console.error("Error fetching referral stats:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch referral statistics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
