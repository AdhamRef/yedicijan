import { NextRequest, NextResponse } from "next/server";
import { waqfAdmin, waqfAudit, serverError } from "@/lib/waqf/api";
import { parseFundInput } from "@/lib/waqf/config";
import { deleteFund, updateFund } from "@/lib/waqf/db";

type Ctx = { params: Promise<{ id: string }> };
const OBJECT_ID = /^[a-f0-9]{24}$/i;

export async function PUT(request: NextRequest, { params }: Ctx) {
  const g = await waqfAdmin();
  if ("denied" in g) return g.denied;
  const { id } = await params;
  if (!OBJECT_ID.test(id)) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const parsed = parseFundInput(await request.json().catch(() => ({})));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const fund = await updateFund(id, parsed.fund);
    if (!fund) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    await waqfAudit(g.session, "WAQF_FUND_UPDATE", `عدّل الصندوق الوقفي: ${parsed.fund.texts.ar?.name ?? ""}`, id);
    return NextResponse.json({ fund });
  } catch (err) {
    return serverError(err, "fund update");
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const g = await waqfAdmin();
  if ("denied" in g) return g.denied;
  const { id } = await params;
  if (!OBJECT_ID.test(id)) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  try {
    if (!(await deleteFund(id))) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    await waqfAudit(g.session, "WAQF_FUND_DELETE", "حذف صندوقاً وقفياً", id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, "fund delete");
  }
}
