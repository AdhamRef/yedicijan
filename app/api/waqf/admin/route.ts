import { NextResponse } from "next/server";
import { waqfAdmin, serverError } from "@/lib/waqf/api";
import { listFunds, readSettings } from "@/lib/waqf/db";

/** Dashboard: settings and every fund, active or not. */
export async function GET() {
  const g = await waqfAdmin();
  if ("denied" in g) return g.denied;
  try {
    const [settings, funds] = await Promise.all([readSettings(), listFunds()]);
    return NextResponse.json({ settings, funds });
  } catch (err) {
    return serverError(err, "admin read");
  }
}
