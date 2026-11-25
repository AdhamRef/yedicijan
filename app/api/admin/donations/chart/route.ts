import { NextRequest, NextResponse } from 'next/server';
import { mergeDonationSourceFilter } from '@/lib/dashboard/donation-source-filter';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { requireAdminOrDashboardPermission } from '@/lib/dashboard/api-auth';
import { donationRowUsdApprox } from '@/lib/dashboard/donation-usd-revenue';
import {
  eachIstanbulDateKey,
  formatIstanbulDateKey,
  getIstanbulDateRange,
} from '@/lib/admin/istanbul-calendar';

function mergeLocaleFilter(where: Record<string, unknown>, locale: string | null): Record<string, unknown> {
  if (!locale || locale === 'all') return where;
  const lw =
    locale === '__unset'
      ? { OR: [{ locale: null }, { locale: '' }] }
      : { locale };
  return { AND: [where, lw] };
}

function mergeCountryFilter(where: Record<string, unknown>, country: string | null): Record<string, unknown> {
  if (!country || country === 'all') return where;
  const cw =
    country === '__unset'
      ? { OR: [{ donorCountryCode: null }, { donorCountryCode: '' }] }
      : { donorCountryCode: country.toUpperCase() };
  return { AND: [where, cw] };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, 'revenue');
    if (denied) return denied;

    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');
    const campaignId = searchParams.get('campaignId');
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') || 'month';
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const showFailed = searchParams.get('showFailed') === 'true';
    const locale = searchParams.get('locale')?.trim() ?? null;
    const country = searchParams.get('country')?.trim() ?? null;

    const { startDate, endDate, startDateKey, endDateKey } = getIstanbulDateRange(period, startParam, endParam);

    // Bucket PAID donations by `paidAt` (the moment money actually landed) and
    // FAILED donations by `createdAt` (they never have a paidAt). This way a
    // donation paid at 00:30 Istanbul May 20 lands in May 20's bar even if its
    // checkout row was inserted at 23:55 May 19. Window is the Istanbul day
    // boundary expressed in UTC.
    // Unsettled rows (status=PAID, no `paidAt`) are NOT counted: revenue is recognised on
    // settlement only.
    const dateWindowOr = [
      { status: 'PAID', paidAt: { gte: startDate, lte: endDate } },
      { status: 'FAILED', createdAt: { gte: startDate, lte: endDate } },
    ];

    const innerWhere: Record<string, unknown> = {
      OR: dateWindowOr,
    };

    if (userId && userId !== 'all') {
      innerWhere.donorId = userId;
    }

    if (campaignId && campaignId !== 'all') {
      innerWhere.AND = [{ items: { some: { campaignId } } }];
    } else if (categoryId && categoryId !== 'all') {
      innerWhere.AND = [
        {
          OR: [
            { items: { some: { campaign: { categoryIds: { has: categoryId } } } } },
            { categoryItems: { some: { categoryId } } },
          ],
        },
      ];
    }

    const baseWhere = mergeDonationSourceFilter(mergeCountryFilter(mergeLocaleFilter(innerWhere, locale), country), searchParams.get('source'));

    // Always fetch both paid and failed donations
    const donations = await prisma.donation.findMany({
      where: baseWhere,
      select: {
        createdAt: true,
        teamSupport: true,
        fees: true,
        amountUSD: true,
        totalAmount: true,
        amount: true,
        // Required by donationRowUsdApprox — without it a USD row with a null amountUSD
        // can't be recognised and would silently contribute 0.
        currency: true,
        status: true,
        paidAt: true,
        items: { select: { amount: true, amountUSD: true } },
        categoryItems: { select: { amount: true, amountUSD: true } },
      },
    });

    type Bucket = {
      amountPaid: number;
      countPaid: number;
      amountFailed: number;
      countFailed: number;
      teamSupport: number;
      fees: number;
    };
    const byDate = new Map<string, Bucket>();

    for (const d of donations) {
      // status=PAID is set at creation, before the gateway confirms, so settlement
      // (`paidAt`) is what makes a row revenue.
      const isPaid = d.status === 'PAID' && d.paidAt != null;
      const isFailed = d.status === 'FAILED';
      if (!isPaid && !isFailed) continue;

      const bucketDate = isPaid ? ((d.paidAt as Date | null) ?? d.createdAt) : d.createdAt;
      const dateStr = formatIstanbulDateKey(bucketDate);
      const bucket = byDate.get(dateStr) ?? {
        amountPaid: 0,
        countPaid: 0,
        amountFailed: 0,
        countFailed: 0,
        teamSupport: 0,
        fees: 0,
      };

      // Every series on this chart is labelled USD, so it must be summed in USD.
      // The old expression fell back to `totalAmount`/`amount` in the row's LOCAL currency,
      // so a ₺1,000 donation with no `amountUSD` plotted as 1000 on a dollar axis.
      // `donationRowUsdApprox` is the same helper the KPI cards use, so chart and card agree.
      const amount = donationRowUsdApprox(d);

      if (isPaid) {
        bucket.amountPaid += amount;
        bucket.countPaid += 1;
        // teamSupport/fees are stored in the local currency too. Prorate them against the
        // row's USD value exactly as /api/admin/stats does, instead of adding raw lira to a
        // dollar total.
        const localTotal = Number(d.totalAmount) || 0;
        if (localTotal > 0) {
          bucket.teamSupport += amount * ((Number(d.teamSupport) || 0) / localTotal);
          bucket.fees += amount * ((Number(d.fees) || 0) / localTotal);
        }
      } else if (isFailed) {
        bucket.amountFailed += amount;
        bucket.countFailed += 1;
      }

      byDate.set(dateStr, bucket);
    }

    const filledChartData: {
      date: string;
      amountUSD: number;
      count: number;
      amountFailed: number;
      countFailed: number;
      teamSupport: number;
      fees: number;
    }[] = [];

    for (const dateStr of eachIstanbulDateKey(startDateKey, endDateKey)) {
      const b = byDate.get(dateStr);
      const amountFailed = b ? Number(Number(b.amountFailed).toFixed(2)) : 0;
      const countFailed = b?.countFailed ?? 0;
      const teamSupport = b ? Number(Number(b.teamSupport).toFixed(2)) : 0;
      const fees = b ? Number(Number(b.fees).toFixed(2)) : 0;

      filledChartData.push({
        date: dateStr,
        amountUSD: b ? Number(Number(b.amountPaid).toFixed(2)) : 0,
        count: b?.countPaid ?? 0,
        amountFailed,
        countFailed,
        teamSupport,
        fees,
      });
    }

    return NextResponse.json(filledChartData);
  } catch (error) {
    console.error('Error fetching donation chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch donation chart data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
