import { NextRequest, NextResponse } from "next/server";
import { runSyncJob } from "@/lib/marketing/sync";

export const dynamic = "force-dynamic";

function day(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangeForLastDays(days: number) {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - days + 1);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { from, to } = rangeForLastDays(7);
    const outcome = await runSyncJob({
      platform: "meta",
      dateFrom: from,
      dateTo: to,
      triggeredBy: "cron:marketing-meta-sync",
    });

    const rowsFetched = outcome.results.reduce((sum, result) => sum + (result.rowsFetched || 0), 0);
    return NextResponse.json({
      ok: outcome.ok,
      status: outcome.status,
      platform: "META",
      range: { from: day(from), to: day(to), days: 7 },
      rowsFetched,
      results: outcome.results.map((result) => ({
        connectionId: result.connectionId,
        platform: result.platform,
        status: result.status,
        rowsFetched: result.rowsFetched,
        message: result.message,
        error: result.error ?? null,
      })),
    });
  } catch (error) {
    console.error("[cron/marketing-meta-sync]", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Meta marketing sync failed" },
      { status: 500 }
    );
  }
}
