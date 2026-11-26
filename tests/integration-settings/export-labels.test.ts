import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
// Ported from Minber al-Aqsa #285 and applied to Yedicihan's export generator.
const s = fs.readFileSync("lib/dashboard/donation-export.ts", "utf8");
test("the total column says it is in the donation's currency", () => {
  assert.match(s, /header: "الإجمالي المدفوع \(بعملة التبرع\)"/);
});
test("the generated-at line is yyyy-mm-dd hh:mm in Istanbul time, not ar-EG digits in UTC", () => {
  assert.match(s, /new Intl\.DateTimeFormat\("en-CA", \{[^}]*hourCycle: "h23", timeZone: "Europe\/Istanbul" \}\)/);
  assert.doesNotMatch(s, /toLocaleString\("ar-EG", \{ timeZone: "UTC" \}\)/);
});
