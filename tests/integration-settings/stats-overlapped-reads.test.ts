import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
// Ported from Minber al-Aqsa #276 and adapted to Yedicihan's stats route: the reads that used to run
// one after another (team support/fees rows, global paid total and count) now start early.
const s = fs.readFileSync("app/api/admin/stats/route.ts", "utf8");
test("the stats endpoint starts its independent reads before the main block and awaits them later", () => {
  const start = s.indexOf("const supportFeesP"), block = s.indexOf("totalCampaigns,");
  assert.ok(start > 0 && start < block, "started before the main Promise.all");
  for (const p of ["supportFeesP", "globalPaidAggP", "globalCountsP"]) assert.match(s, new RegExp(`await ${p}\\b|\\(await ${p}\\)`), p);
  assert.match(s, /p\.catch\(\(\) => undefined\)/, "no unhandled rejection while waiting");
  assert.equal((s.match(/where: globalPaidWhere \}\)/g) ?? []).length, 2, "each global read is issued once (moved, not duplicated)");
});
