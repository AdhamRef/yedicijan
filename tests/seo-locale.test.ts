// Page titles and SEO texts: each language in its own words, brand once, current facts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LOCALE_SEO, buildPageMetadata } from "../lib/seo";

const ROOT = join(__dirname, "..");
const ARABIC = /[؀-ۿ]/;

for (const [loc, seo] of Object.entries(LOCALE_SEO)) {
  if (loc === "ar") continue;
  test(`${loc}: no Arabic, current facts, brand once per page title`, () => {
    const text = JSON.stringify(seo);
    assert.doesNotMatch(text, ARABIC);
    assert.doesNotMatch(text, /2011/);
    assert.match(seo.description, /1961/);
    assert.match(seo.description, /23/);
    for (const page of [seo.campaigns, seo.about, seo.contact, seo.blog]) {
      assert.equal(page.title.split(seo.siteName).length - 1, 1, page.title);
    }
  });
}

test("page titles are absolute and carry the brand exactly once", () => {
  for (const loc of Object.keys(LOCALE_SEO)) {
    const seo = LOCALE_SEO[loc as keyof typeof LOCALE_SEO];
    const plain = buildPageMetadata(loc, { title: "X", description: "d", path: "/x" });
    assert.deepEqual(plain.title, { absolute: `X | ${seo.siteName}` });
    const branded = buildPageMetadata(loc, { title: seo.about.title, description: "d", path: "/about-us" });
    assert.deepEqual(branded.title, { absolute: seo.about.title });
  }
});

test("locale layout does not inherit the Arabic root template", () => {
  const src = readFileSync(join(ROOT, "app/[locale]/layout.tsx"), "utf8");
  assert.match(src, /title:\s*\{\s*absolute:\s*seo\.title/);
});
