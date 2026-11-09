import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVE_CATEGORY_TRANSLATION_LOCALES,
  CategoryCreateInputError,
  parseCategoryCreatePayload,
} from "../../lib/campaign/category-create-payload";

test("accepts valid Arabic/English category with optional active locales", () => {
  const input = {
    name: "زكاة المال",
    description: "ساهم بزكاة مالك",
    translations: { en: { name: "Zakat al-Mal", slug: "Zakat Al Mal" }, tr: { name: "Mali Zekat" } },
  };
  const parsed = parseCategoryCreatePayload(input);
  assert.equal(parsed.name, "زكاة المال");
  assert.deepEqual(parsed.translations.map((x) => x.locale), ["en", "tr"]);
  assert.equal(parsed.translations[0].requestedSlug, "zakat-al-mal");
  assert.equal(parsed.order, 0);
});

test("preserves YediCihan's seven translation locales and Arabic base", () => {
  assert.deepEqual([...ACTIVE_CATEGORY_TRANSLATION_LOCALES], ["en", "fr", "tr", "id", "pt", "es", "de"]);
});

test("rejects malformed or missing English translation instead of server error", () => {
  for (const input of [
    null, { name: "زكاة المال" }, { name: "زكاة المال", translations: { en: { name: "" } } },
    { name: "", translations: { en: { name: "Zakat" } } },
    { name: "زكاة المال", translations: "wrong" },
  ]) {
    assert.throws(() => parseCategoryCreatePayload(input), CategoryCreateInputError);
  }
});

test("rejects extra locales and invalid translation structures", () => {
  const base = { name: "زكاة المال", translations: { en: { name: "Zakat" } } };
  assert.throws(
    () => parseCategoryCreatePayload({ ...base, translations: { ...base.translations, sq: { name: "Wrong" } } }),
    CategoryCreateInputError,
  );
  assert.throws(
    () => parseCategoryCreatePayload({ ...base, translations: { en: "Wrong" } }),
    CategoryCreateInputError,
  );
  assert.throws(
    () => parseCategoryCreatePayload({ ...base, translations: { ...base.translations, fr: { description: "Only description" } } }),
    CategoryCreateInputError,
  );
});

test("rejects unsafe images and malformed ordering", () => {
  const base = { name: "زكاة المال", translations: { en: { name: "Zakat" } } };
  for (const image of ["javascript:alert(1)", "http://example.test/image.jpg", "/relative.jpg", "not-a-url"]) {
    assert.throws(() => parseCategoryCreatePayload({ ...base, image }), CategoryCreateInputError);
  }
  assert.throws(() => parseCategoryCreatePayload({ ...base, order: 1.5 }), CategoryCreateInputError);
});

test("trims texts and ignores empty optional languages", () => {
  const parsed = parseCategoryCreatePayload({
    name: " زكاة المال ",
    translations: { en: { name: " Zakat " }, fr: { name: " " } },
    image: "https://res.cloudinary.com/sample/image/upload/a.jpg",
  });
  assert.equal(parsed.name, "زكاة المال");
  assert.deepEqual(parsed.translations.map((row) => row.locale), ["en"]);
  assert.equal(parsed.image, "https://res.cloudinary.com/sample/image/upload/a.jpg");
});
