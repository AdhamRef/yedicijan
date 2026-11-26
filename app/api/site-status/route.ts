import { NextResponse } from "next/server";
import { readEmergency } from "@/lib/site-security/emergency";

export const dynamic = "force-dynamic";
/**
 * Public, tiny: lets the browser show the donation-pause notice, or the maintenance
 * page when the whole site is closed, even on cached pages.
 */
export async function GET() {
  const { mode } = await readEmergency();
  return NextResponse.json({ donationsPaused: mode !== "OFF", siteClosed: mode === "SITE" }, { headers: { "Cache-Control": "public, max-age=15" } });
}
