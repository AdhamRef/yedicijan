import test from "node:test";
import assert from "node:assert/strict";
import { validateBannerInput } from "../../lib/content/yedicihan-urgent-banner";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "../../lib/locales";

const campaignId = "507f1f77bcf86cd799439011";
const base = {
  title: "إغاثة عاجلة",
  description: "مساهمة مباشرة",
  ctaLabel: "ساهم الآن",
  campaignId,
  priority: 2,
};

test("new banner defaults to Arabic only until explicit translations are provided", () => {
  const b = validateBannerInput(base);
  assert.equal(b.ok, true);
  if (b.ok) {
    assert.deepEqual(b.value.locales, ["ar"]);
    assert.equal(b.value.campaignId, campaignId);
  }
});

test("only preexisting YediCihan locales can be translated", () => {
  assert.deepEqual([...SUPPORTED_LOCALES], ["ar","en","fr","tr","id","pt","es","de"]);
  assert.equal(DEFAULT_LOCALE, "ar");
  const ok = validateBannerInput({ ...base, translations: { tr: { title: "Acil yardım", ctaLabel: "Bağış yap" } } });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.deepEqual(ok.value.locales, ["ar", "tr"]);
  assert.equal(validateBannerInput({ ...base, translations: { sq: { title: "test", ctaLabel: "test" } } }).ok, false);
  assert.equal(validateBannerInput({ ...base, translations: { ur: { title: "test", ctaLabel: "test" } } }).ok, false);
});

test("translated banner needs a translated CTA", () => {
  assert.equal(validateBannerInput({ ...base, translations: { en: { title: "Emergency", ctaLabel: "" } } }).ok, false);
  assert.equal(validateBannerInput({ ...base, translations: { ar: { title: "Duplicate", ctaLabel: "CTA" } } }).ok, false);
});

test("rejects non-HTTPS imagery, invalid project ids and malformed dates", () => {
  assert.equal(validateBannerInput({ ...base, imageUrl: "http://example.org/p.jpg" }).ok, false);
  assert.equal(validateBannerInput({ ...base, campaignId: "abc" }).ok, false);
  assert.equal(validateBannerInput({ ...base, startsAt: "2026-11-11T00:00:00.000Z", endsAt: "2026-11-10T00:00:00.000Z" }).ok, false);
  assert.equal(validateBannerInput({ ...base, imageUrl: "https://example.org/p.jpg" }).ok, true);
});

test("public activation is not an accepted creation field", () => {
  assert.equal(validateBannerInput({ ...base, isActive: true }).ok, false);
  assert.equal(validateBannerInput({ ...base, paymentProvider: "stripe" }).ok, false);
});
