import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
// Ported from Minber al-Aqsa #294: the parts that exist in Yedicihan (Minber's home-page CSS and
// conversations workspace are not part of this site).
test("phone review polish: dashboard fields at 16 px, phone numbers LTR, Arabic badge plural", () => {
  assert.match(fs.readFileSync("styles/dashboard-utilities.css", "utf8"), /\.dash-shell select, \.dash-shell textarea \{ font-size: 16px; \}/);
  assert.match(fs.readFileSync("app/[locale]/profile/_components/EditDialog.tsx", "utf8"), /type === "tel" \? <bdi dir="ltr">\{value\}<\/bdi>/);
  const ar = JSON.parse(fs.readFileSync("i18n/messages/ar.json", "utf8"));
  const text = JSON.stringify(ar);
  assert.match(text, /two \{حصلت على وسامين\}/);
});
