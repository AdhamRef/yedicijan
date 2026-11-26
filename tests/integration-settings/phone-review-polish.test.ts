import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
// Minber's site and dashboard stylesheets and the conversations page are not in this repo: their checks are left out.
test("phone review polish: phone number LTR, Arabic plural", () => {
  assert.match(fs.readFileSync("app/[locale]/profile/_components/EditDialog.tsx", "utf8"), /type === "tel" \? <bdi dir="ltr">\{value\}<\/bdi>/);
  assert.match(fs.readFileSync("i18n/messages/ar.json", "utf8"), /two \{حصلت على وسامين\}/);
});
