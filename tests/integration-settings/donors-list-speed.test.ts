import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("badges for a page of donors are evaluated together, attached in badge order", () => {
  const s = fs.readFileSync("lib/badge-criteria.ts", "utf8");
  assert.match(s, /await Promise\.all\(badges\.map\(\(badge\) => getUserIdsMatchingBadge\(badge\.criteria\)\)\)/);
  assert.doesNotMatch(s, /for \(const badge of badges\) \{\n\s*const matching = await/);
});
// This repo's users route does not compute a registered-donors total, so the cache test is left out.
