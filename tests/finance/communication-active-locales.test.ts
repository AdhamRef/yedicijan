import test from "node:test";
import assert from "node:assert/strict";
import { computeLanguageCoverage } from "../../lib/communication/language-coverage";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "../../lib/locales";

test("YediCihan current eight locales remain the communication contract", () => {
  assert.deepEqual([...SUPPORTED_LOCALES], ["ar","en","fr","tr","id","pt","es","de"]);
  assert.equal(DEFAULT_LOCALE, "ar");
});

test("disabled registered languages are not treated as active campaign audience languages", () => {
  const result = computeLanguageCoverage(
    { ar: 2, en: 3, sq: 4, it: 1, nl: 2, sv: 1 },
    ["ar", "en", "sq", "it", "nl", "sv"],
  );
  assert.deepEqual(result.locales.map((x) => x.locale).sort(), ["ar", "en"]);
  assert.equal(result.missingWithRecipients.length, 0);
  assert.equal(result.canSendWithoutDecision, true);
});

test("a template in an inactive language cannot provide false coverage for active recipients", () => {
  const result = computeLanguageCoverage({ tr: 5, de: 2 }, ["sq"]);
  assert.equal(result.canSendWithoutDecision, false);
  assert.deepEqual(result.missingWithRecipients.map((x) => x.locale).sort(), ["de", "tr"]);
});

test("the configured valid fallback can provide coverage for an active locale", () => {
  const result = computeLanguageCoverage({ fr: 3, tr: 2 }, ["en"]);
  assert.equal(result.locales.find((x) => x.locale === "fr")?.status, "FALLBACK");
  assert.equal(result.locales.find((x) => x.locale === "tr")?.status, "FALLBACK");
});
