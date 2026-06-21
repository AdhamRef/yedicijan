import { NextRequest, NextResponse } from "next/server";
import { refreshExchangeRatesFromApi } from "@/lib/exchange/rates-service";

/**
 * Hourly refresh of USD-base rates from ExchangeRate-API into MongoDB.
 * Configure: Vercel Cron (see vercel.json) or any scheduler calling:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/cron/exchange-rates
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rates = await refreshExchangeRatesFromApi();
    const count = Object.keys(rates).length;
    return NextResponse.json({
      ok: true,
      currencies: count,
      message: "Exchange rates refreshed",
    });
  } catch (e) {
    console.error("[cron/exchange-rates]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Refresh failed" },
      { status: 500 }
    );
  }
}
