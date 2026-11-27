import { NextRequest, NextResponse } from "next/server";
import { waqfAdmin, waqfAudit, serverError } from "@/lib/waqf/api";
import { parseSettingsInput } from "@/lib/waqf/config";
import { saveSettings } from "@/lib/waqf/db";

export async function PUT(request: NextRequest) {
  const g = await waqfAdmin();
  if ("denied" in g) return g.denied;
  try {
    const settings = await saveSettings(parseSettingsInput(await request.json().catch(() => ({}))));
    await waqfAudit(g.session, "WAQF_SETTINGS_UPDATE", "عدّل إعدادات صفحة الصناديق الوقفية");
    return NextResponse.json({ settings });
  } catch (err) {
    return serverError(err, "settings save");
  }
}
