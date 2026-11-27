import { NextResponse } from "next/server";
import { publicWaqf } from "@/lib/waqf/cache";
import { DEFAULT_SETTINGS } from "@/lib/waqf/config";

/** Public: the /waqf page's settings and active funds. Empty funds → the page uses its built-in ones. */
export async function GET() {
  try {
    return NextResponse.json(await publicWaqf());
  } catch (err) {
    console.error("[waqf] public read:", err);
    return NextResponse.json({ settings: DEFAULT_SETTINGS, funds: [] });
  }
}
