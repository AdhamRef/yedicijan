import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";
import { summarizeSettledAttribution } from "@/lib/marketing/settled-attribution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hard bound because a partial report must never claim complete totals.
const READ_CEILING = 5000;

function utcDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + "T00:00:00.000Z");
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== value ? null : date;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  // Marketing attribution must not grant access to donors' financial receipts.
  const denied = requireAdminOrDashboardPermission(session, "referrals")
    ?? requireAdminOrDashboardPermission(session, "revenue");
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const fromRaw = params.get("from");
  const toRaw = params.get("to");
  const from = fromRaw ? utcDate(fromRaw) : null;
  const to = toRaw ? utcDate(toRaw) : null;
  if ((fromRaw && !from) || (toRaw && !to) || (from && to && to < from)) {
    return NextResponse.json({ error: "الفترة غير صحيحة (YYYY-MM-DD)" }, { status: 400 });
  }
  const upper = to ? new Date(to.getTime() + 86400000) : null;
  try {
    const where = {
      status: "PAID" as const,
      paidAt: {
        not: null,
        ...(from ? { gte: from } : {}),
        ...(upper ? { lt: upper } : {}),
      },
    };
    const [totalMatching, rows] = await Promise.all([
      prisma.donation.count({ where }),
      prisma.donation.findMany({
        where,
        select: {
          id: true, status: true, paidAt: true,
          amount: true, amountUSD: true, currency: true,
          subscriptionId: true, attribution: true,
        },
        orderBy: { paidAt: "desc" },
        take: READ_CEILING,
      }),
    ]);
    const report = summarizeSettledAttribution(rows);
    return NextResponse.json({
      ...report,
      period: { from: fromRaw, to: toRaw, timezone: "UTC" },
      sampled: rows.length,
      totalMatching,
      complete: totalMatching <= READ_CEILING,
      warnings: [
        ...(totalMatching > READ_CEILING ? ["نتيجة جزئية: تجاوزت التبرعات حد القراءة؛ لا تعتمد الإجمالي بوصفه شاملًا"] : []),
        ...(report.totals.missingUsd ? ["بعض العمليات لا تتضمن تحويلًا موثوقًا إلى الدولار؛ استُبعدت قيمتها لا عددها"] : []),
      ],
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("settled attribution audit failed", error);
    return NextResponse.json({ error: "تعذر إعداد تقرير التحصيل المؤكد" }, { status: 500 });
  }
}
