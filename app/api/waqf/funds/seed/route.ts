import { NextResponse } from "next/server";
import { waqfAdmin, waqfAudit, serverError } from "@/lib/waqf/api";
import { countFunds, createFund } from "@/lib/waqf/db";
import { FUND_KINDS, type FundTexts } from "@/lib/waqf/config";
import { SUPPORTED_LOCALES } from "@/lib/locales";

/**
 * Copies the page's six built-in funds into the database (texts in every language from the
 * site's messages) so the team can edit them. Only when there are no funds yet.
 */
export async function POST() {
  const g = await waqfAdmin();
  if ("denied" in g) return g.denied;
  try {
    if ((await countFunds()) > 0) return NextResponse.json({ error: "توجد صناديق بالفعل" }, { status: 409 });
    const messages = await Promise.all(
      SUPPORTED_LOCALES.map(async (loc) => [loc, (await import(`@/i18n/messages/${loc}.json`)).default?.Waqf ?? {}] as const),
    );
    for (const kind of FUND_KINDS.filter((k) => k !== "general")) {
      const texts: FundTexts = {};
      for (const [loc, w] of messages) {
        texts[loc] = { name: w[`fund_${kind}`] ?? "", description: w[`fund_${kind}_d`] ?? "", badge: "" };
      }
      await createFund({ kind, isActive: true, featured: false, image: null, shareUSD: null, campaignIds: [], showProgress: false, texts });
    }
    await waqfAudit(g.session, "WAQF_FUND_SEED", "أضاف الصناديق الوقفية الستة الافتراضية");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, "fund seed");
  }
}
