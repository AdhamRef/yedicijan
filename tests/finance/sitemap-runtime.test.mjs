import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("app/sitemap.ts", "utf8");
const seo = readFileSync("lib/seo.ts", "utf8");

test("sitemap always resolves at request time, never at build", () => {
  assert.match(route, /export const dynamic = "force-dynamic"/);
});

test("existing campaign, category, blog and static sitemap links remain", () => {
  for (const key of ['"/campaign"', '"/category"', '"/blog"', 'prisma.campaign.findMany', 'prisma.category.findMany', 'prisma.post.findMany', 'buildStaticAlternates', 'buildLocaleAlternatesForEntity']) {
    assert.ok(route.includes(key), "missing sitemap source: " + key);
  }
});

test("sitemap derives locale set from existing YediCihan SEO config", () => {
  assert.match(route, /import \{ SITE_URL, LOCALES \} from "@\/lib\/seo"/);
  assert.match(seo, /export const LOCALES = SUPPORTED_LOCALES/);
});

test("database query failure is not hidden as successful incomplete sitemap", () => {
  assert.match(route, /throw error/);
  assert.doesNotMatch(route, /catch\s*\{\s*\}/);
});
