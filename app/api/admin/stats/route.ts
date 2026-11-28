import { NextRequest, NextResponse } from 'next/server';
import { mergeDonationSourceFilter } from '@/lib/dashboard/donation-source-filter';
import { mergeDonationProviderFilter } from '@/lib/dashboard/donation-provider-filter';
import { campaignCategoryWhere, donationCampaignWhere, donationCategoryWhere, donationCountryWhere, donationLocaleWhere, idOrIn } from '@/lib/dashboard/donation-multi-filter';
import { prisma } from '@/lib/prisma';
import { getCurrentCalendarMonthIstanbulRange } from '@/lib/admin/current-calendar-month-utc';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { requireAdminOrDashboardPermission } from '@/lib/dashboard/api-auth';
import {
  PAID_DONATION_FILTER,
  donationRowUsdApprox,
  donationUsdSumFallback,
} from '@/lib/dashboard/donation-usd-revenue';
import { istanbulDateKeysToUtcRange } from '@/lib/admin/istanbul-calendar';
import { donationWhereAll } from '@/lib/donations/mongo-null';

function getDateRange(period: string, startParam?: string | null, endParam?: string | null) {
  let endDate: Date;
  let startDate: Date;
  if (startParam && endParam) {
    // Dashboard filter emits Istanbul YYYY-MM-DD keys — interpret 00:00 as
    // Istanbul midnight so the stats match the chart bucketing.
    ({ startDate, endDate } = istanbulDateKeysToUtcRange(startParam, endParam));
  } else if (period === 'all') {
    endDate = new Date();
    startDate = new Date(endDate);
    startDate.setFullYear(startDate.getFullYear() - 10);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);
  } else {
    endDate = endParam ? new Date(endParam + 'T23:59:59.999Z') : new Date();
    startDate = new Date(endDate);
    const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    startDate.setUTCDate(startDate.getUTCDate() - days);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);
  }
  return { startDate, endDate };
}

function buildDonationWhere(
  startDate: Date,
  endDate: Date,
  categoryId: string | null,
  campaignId: string | null
) {
  const dateFilter = { createdAt: { gte: startDate, lte: endDate } };
  const base: Record<string, unknown> = { ...dateFilter };
  const campaignScope = donationCampaignWhere(campaignId);
  const categoryScope = donationCategoryWhere(categoryId);
  if (campaignScope) {
    base.items = campaignScope.items;
  } else if (categoryScope) {
    base.OR = categoryScope.OR;
  }
  return base;
}

/** Same filters as buildDonationWhere but no date — all-time إيرادات (donation amountUSD sum) */
function buildDonationWhereAllTime(categoryId: string | null, campaignId: string | null) {
  const base: Record<string, unknown> = {};
  const campaignScope = donationCampaignWhere(campaignId);
  const categoryScope = donationCategoryWhere(categoryId);
  if (campaignScope) {
    base.items = campaignScope.items;
  } else if (categoryScope) {
    base.OR = categoryScope.OR;
  }
  return base;
}

// One value gives the same condition as before; "a,b" means any of them (#282).
function mergeLocaleFilter(where: Record<string, unknown>, locale: string | null): Record<string, unknown> {
  const lw = donationLocaleWhere(locale);
  return lw ? { AND: [where, lw] } : where;
}

function mergeCountryFilter(where: Record<string, unknown>, country: string | null): Record<string, unknown> {
  const cw = donationCountryWhere(country);
  return cw ? { AND: [where, cw] } : where;
}

function mergeFilters(
  where: Record<string, unknown>,
  locale: string | null,
  country: string | null,
  source: string | null = null,
  provider: string | null = null
) {
  // source: the donation-source filter — the chart, list and export applied it; the KPIs did not (#287).
  // provider: the payment-gateway filter (stored metadata only; no gateway is called).
  return mergeDonationProviderFilter(mergeDonationSourceFilter(mergeCountryFilter(mergeLocaleFilter(where, locale), country), source), provider);
}

function buildDonationItemWhere(
  startDate: Date,
  endDate: Date,
  categoryId: string | null,
  campaignId: string | null,
  locale: string | null,
  country: string | null,
  source: string | null = null,
  provider: string | null = null
) {
  const base: Record<string, unknown> = {
    donation: mergeFilters(
      { createdAt: { gte: startDate, lte: endDate }, ...PAID_DONATION_FILTER },
      locale,
      country,
      source,
      provider
    ),
  };
  const campaignIds = idOrIn(campaignId);
  const inCategory = campaignCategoryWhere(categoryId);
  if (campaignIds) {
    base.campaignId = campaignIds;
  } else if (inCategory) {
    base.campaign = inCategory;
  }
  return base;
}

function buildDonationCategoryItemWhere(
  startDate: Date,
  endDate: Date,
  categoryId: string | null,
  locale: string | null,
  country: string | null,
  source: string | null = null,
  provider: string | null = null
) {
  const base: Record<string, unknown> = {
    donation: mergeFilters(
      { createdAt: { gte: startDate, lte: endDate }, ...PAID_DONATION_FILTER },
      locale,
      country,
      source,
      provider
    ),
  };
  const categoryIds = idOrIn(categoryId);
  if (categoryIds) {
    base.categoryId = categoryIds;
  }
  return base;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, 'revenue');
    if (denied) return denied;

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'all';
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const categoryId = searchParams.get('categoryId');
    const campaignId = searchParams.get('campaignId');
    const locale = searchParams.get('locale')?.trim() ?? null;
    const country = searchParams.get('country')?.trim() ?? null;
    const source = searchParams.get('source')?.trim() ?? null;
    const provider = searchParams.get('provider')?.trim() ?? null;

    const { startDate, endDate } = getDateRange(period, startParam, endParam);
    const donationWhere = mergeFilters(
      buildDonationWhere(startDate, endDate, categoryId, campaignId),
      locale,
      country,
      source,
      provider
    );
    const donationWhereAllTime = mergeFilters(
      buildDonationWhereAllTime(categoryId, campaignId),
      locale,
      country,
      source,
      provider
    );

    // Revenue counts settled donations only — see lib/dashboard/donation-usd-revenue.ts.
    //
    // These MUST be composed with donationWhereAll, not object spread. Both `donationWhere`
    // (category filter) and PAID_DONATION_FILTER carry a top-level `OR`, and spreading one over
    // the other silently drops the category filter — which made every revenue card show
    // org-wide totals next to a correctly-scoped donation count.
    const paidWhere = donationWhereAll(donationWhere, PAID_DONATION_FILTER);
    const failedWhere = donationWhereAll(donationWhere, { status: 'FAILED' as const });

    const { monthStart, monthEnd } = getCurrentCalendarMonthIstanbulRange();
    const thisMonthDonationWhere = mergeFilters(
      buildDonationWhere(monthStart, monthEnd, categoryId, campaignId),
      locale,
      country,
      source,
      provider
    );
    const thisMonthPaidWhere = donationWhereAll(thisMonthDonationWhere, PAID_DONATION_FILTER);

    // Independent reads start now and run alongside the block below (same queries, same results; only overlapped).
    const supportFeesP = prisma.donation.findMany({
      where: paidWhere,
      select: { amountUSD: true, amount: true, currency: true, totalAmount: true, teamSupport: true, fees: true },
      take: 100000,
    });
    /** All successful charges ever — ignores period / category / campaign query filters */
    const globalPaidWhere = { ...PAID_DONATION_FILTER };
    const globalPaidAggP = prisma.donation.aggregate({ _sum: { amountUSD: true }, where: globalPaidWhere });
    const globalCountsP = prisma.donation.count({ where: globalPaidWhere });
    // A rejected early read is awaited below; until then it must not surface as an unhandled rejection.
    for (const p of [supportFeesP, globalPaidAggP, globalCountsP]) p.catch(() => undefined);

    const [
      totalCampaigns,
      totalCategories,
      totalUsers,
      totalDonations,
      paidCount,
      failedCount,
      totalAmountResult,
      thisMonthTotalResult,
      allTimeRevenueResult,
      failedTotalResult,
      campaignDonationsSum,
      categoryDonationsSum,
      recentDonations,
    ] = await Promise.all([
      prisma.campaign.count(),
      prisma.category.count(),
      prisma.user.count(),
      prisma.donation.count({ where: donationWhere }),
      prisma.donation.count({ where: paidWhere }),
      prisma.donation.count({ where: failedWhere }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: paidWhere,
      }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: thisMonthPaidWhere,
      }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: donationWhereAll(donationWhereAllTime, PAID_DONATION_FILTER),
      }),
      prisma.donation.aggregate({
        _sum: { amountUSD: true },
        where: failedWhere,
      }),
      prisma.donationItem.aggregate({
        _sum: { amountUSD: true, amount: true },
        _count: { id: true },
        where: buildDonationItemWhere(startDate, endDate, categoryId, campaignId, locale, country, source, provider),
      }),
      prisma.donationCategoryItem.aggregate({
        _sum: { amountUSD: true, amount: true },
        _count: { id: true },
        where: buildDonationCategoryItemWhere(startDate, endDate, categoryId, locale, country, source, provider),
      }),
      prisma.donation.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: donationWhere,
        select: {
          id: true,
          amount: true,
          totalAmount: true,
          amountUSD: true,
          createdAt: true,
          currency: true,
          status: true,
          provider: true,
          paymentMethod: true,
          providerErrorMessage: true,
          attribution: true,
          conversionEventsSentAt: true,
          conversionFailedEventsSentAt: true,
          donor: { select: { name: true } },
          items: {
            select: {
              campaign: { select: { title: true } },
            },
          },
          categoryItems: {
            select: {
              category: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    // Card 1 (إيرادات ناجحة للفترة) must match the way thisMonthRevenue/allTimeRevenue
    // are computed — a single sum over paidWhere.
    let totalAmount = totalAmountResult._sum?.amountUSD ?? 0;
    if (totalAmount === 0 && paidCount > 0) {
      totalAmount = await donationUsdSumFallback(paidWhere);
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
      const allTimePaidWhere = donationWhereAll(donationWhereAllTime, PAID_DONATION_FILTER);
      const allTimePaidCount = await prisma.donation.count({ where: allTimePaidWhere });
      if (allTimePaidCount > 0) {
        allTimeRevenue = await donationUsdSumFallback(allTimePaidWhere);
      }
    }
    const campaignDonationsTotal = campaignDonationsSum._sum?.amountUSD ?? campaignDonationsSum._sum?.amount ?? 0;
    const categoryDonationsTotal = categoryDonationsSum._sum?.amountUSD ?? categoryDonationsSum._sum?.amount ?? 0;
    const campaignDonationsCount = campaignDonationsSum._count?.id ?? 0;
    const categoryDonationsCount = categoryDonationsSum._count?.id ?? 0;

    const donationsForSupportFees = await supportFeesP;
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
          // `|| 1` was a divide-by-zero guard that silently changed the MEANING of the sum:
          // with totalAmount = 0 the row stopped contributing its *share* of teamSupport and
          // instead contributed `usd * teamSupport` outright, letting a single row dominate
          // the whole card. A row we cannot prorate must contribute nothing, not something
          // wrong. (Measured 2026-08-01: 0 settled rows have totalAmount <= 0 today, so this
          // guards a future row rather than correcting a current number.)
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
      amountUSD: d.amountUSD ?? 0,
      currency: d.currency,
      donorName: d.donor?.name ?? '—',
      status: d.status,
      provider: d.provider ?? null,
      paymentMethod: d.paymentMethod ?? null,
      providerErrorMessage: d.providerErrorMessage ?? null,
      attribution: d.attribution ?? null,
      conversionEventsSentAt: d.conversionEventsSentAt ?? null,
      conversionFailedEventsSentAt: d.conversionFailedEventsSentAt ?? null,
      campaignTitle: d.items[0]?.campaign?.title ?? null,
      categoryName: d.categoryItems[0]?.category?.name ?? null,
      createdAt: d.createdAt,
    }));

    const failedTotalAmount = failedTotalResult._sum?.amountUSD ?? 0;

    let paidRevenueAllTimeUnfiltered = (await globalPaidAggP)._sum?.amountUSD ?? 0;
    if (paidRevenueAllTimeUnfiltered === 0) {
      const globalPaidCount = await globalCountsP;
      if (globalPaidCount > 0) {
        paidRevenueAllTimeUnfiltered = await donationUsdSumFallback(globalPaidWhere);
      }
    }

    // Companion to `paidRevenueAllTimeUnfiltered`, for the headline band that states it is
    // NOT affected by the period/category/campaign filters. The filtered `paidCount` above
    // cannot be shown next to that claim — on a filtered view it would quietly contradict
    // the figure it sits beside.
    const paidCountAllTimeUnfiltered = await globalCountsP;

    return NextResponse.json({
      totalCampaigns,
      totalCategories,
      totalDonations,
      totalUsers,
      // Revenue (PAID only)
      totalAmount,
      allTimeRevenue,
      paidRevenueAllTimeUnfiltered,
      paidCountAllTimeUnfiltered,
      paidCount,
      failedCount,
      failedTotalAmount,
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
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch admin statistics',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
