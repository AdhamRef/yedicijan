import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
// Ported from Minber al-Aqsa #278 for Yedicihan: a registered association (Derneği), never a foundation,
// in every enabled site language. "fundacional" (Spanish: founding) is not a name for the organization.
const FOUNDATION = /\b(foundation|fondation|stiftung|fundación|fundação|yayasan|vakf[ıi])\b|مؤسسة/i;
test("the organization is called an association in every enabled language", () => {
  for (const l of ["ar", "en", "fr", "tr", "id", "pt", "es", "de"]) {
    const s = fs.readFileSync(`i18n/messages/${l}.json`, "utf8");
    assert.doesNotMatch(s, FOUNDATION, l);
  }
  assert.match(fs.readFileSync("i18n/messages/de.json", "utf8"), /Quittung des Vereins/);
});
