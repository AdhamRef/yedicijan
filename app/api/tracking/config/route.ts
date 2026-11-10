import { NextResponse } from "next/server";
import { getPublicTrackingConfig } from "@/lib/tracking/tracking-settings";

// GET /api/tracking/config — public browser config only. No access tokens or API secrets.
export async function GET() {
  try {
    const config = await getPublicTrackingConfig();
    return NextResponse.json(config, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (e) {
    console.error("Error fetching tracking config:", e);
    return NextResponse.json({
      facebookPixelId: null,
      gaMeasurementId: null,
      googleAdsConversionId: null,
      googleAdsConversionLabel: null,
      tiktokPixelId: null,
      xPixelId: null,
      clarityProjectId: null, clarityEnabled: false,
      gtmContainerId: null, gtmEnabled: false,
    }, { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
