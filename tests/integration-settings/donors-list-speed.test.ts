import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
// Ported from Minber al-Aqsa #266. Yedicihan's users API has no separate
// registered-donors total, so only the parallel-badges half applies.
test("badges for a page of donors are evaluated together, attached in badge order", () => {
  const s = fs.readFileSync("lib/badge-criteria.ts", "utf8");
  assert.match(s, /await Promise\.all\(badges\.map\(\(badge\) => getUserIdsMatchingBadge\(badge\.criteria\)\)\)/);
  assert.doesNotMatch(s, /for \(const badge of badges\) \{\r?\n\s*const matching = await/);
});
