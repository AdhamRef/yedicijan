import { NextRequest, NextResponse } from "next/server";
import { waqfAdmin, waqfAudit, serverError } from "@/lib/waqf/api";
import { parseFundInput } from "@/lib/waqf/config";
import { createFund } from "@/lib/waqf/db";

export async function POST(request: NextRequest) {
  const g = await waqfAdmin();
  if ("denied" in g) return g.denied;
  const parsed = parseFundInput(await request.json().catch(() => ({})));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const fund = await createFund(parsed.fund);
    await waqfAudit(g.session, "WAQF_FUND_CREATE", `أضاف صندوقاً وقفياً: ${parsed.fund.texts.ar?.name ?? ""}`, fund.id);
    return NextResponse.json({ fund }, { status: 201 });
  } catch (err) {
    return serverError(err, "fund create");
  }
}
