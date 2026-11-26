import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const s = fs.readFileSync("app/api/admin/stats/route.ts", "utf8");
// This repo has no provider filter: source is applied next to locale and country.
test("the home KPIs read and apply the donation-source filter like the chart and the list", () => {
  assert.match(s, /const source = searchParams\.get\('source'\)/);
  assert.match(s, /mergeDonationSourceFilter\(mergeCountryFilter\(/);
  const get = s.slice(s.indexOf("export async function GET"));
  assert.equal((get.match(/\bcountry\)/g) ?? []).length, 0, "no call passes country without source");
  assert.equal((get.match(/country,\s*source\s*\)/g) ?? []).length, 5);
});
