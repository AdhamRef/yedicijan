import { NextRequest, NextResponse } from "next/server";
import { waqfAdmin, waqfAudit, serverError } from "@/lib/waqf/api";
import { reorderFunds } from "@/lib/waqf/db";

export async function POST(request: NextRequest) {
  const g = await waqfAdmin();
  if ("denied" in g) return g.denied;
  const body = await request.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown): x is string => typeof x === "string" && /^[a-f0-9]{24}$/i.test(x)) : [];
  if (!ids.length) return NextResponse.json({ error: "لا يوجد ترتيب" }, { status: 400 });
  try {
    await reorderFunds(ids.slice(0, 100));
    await waqfAudit(g.session, "WAQF_FUND_REORDER", "أعاد ترتيب الصناديق الوقفية");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, "fund reorder");
  }
}
