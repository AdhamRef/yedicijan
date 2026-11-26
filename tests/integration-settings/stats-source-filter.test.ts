import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
// Ported from Minber al-Aqsa #287 and adapted to Yedicihan's stats route (no provider filter here).
const s = fs.readFileSync("app/api/admin/stats/route.ts", "utf8");
test("the home KPIs read and apply the donation-source filter like the chart and the list", () => {
  assert.match(s, /const source = searchParams\.get\('source'\)/);
  assert.match(s, /mergeDonationSourceFilter\(mergeCountryFilter\(mergeLocaleFilter\(/);
  const get = s.slice(s.indexOf("export async function GET"));
  // the three donation scopes plus the two item aggregates all pass the source on
  assert.equal((get.match(/country,\s*source\s*\)/g) ?? []).length, 5);
});
test("the page sends the source filter to the KPI stats and to today's card", () => {
  const page = fs.readFileSync("app/(dashboard)/dashboard/page.tsx", "utf8");
  for (const fn of ["const fetchStats = useCallback(", "const fetchTodayStats = useCallback("]) {
    const at = page.indexOf(fn);
    const body = page.slice(at, page.indexOf("}, [", at));
    assert.match(body, /params\.set\("source", donationSourceFilter\)/, fn);
  }
});
