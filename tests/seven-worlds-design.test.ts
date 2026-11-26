// Proves the Seven Worlds design update: slug decoding (SEO fix), bidi-safe
// amounts, the shared low-funding threshold, no donor counts in the public UI,
// no new image files, and complete ar/en/tr strings for the new components.
// Relative imports only (no "@/" alias) so the file runs under `node --import tsx --test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { decodeRouteParam } from "../lib/slug";
import { LOW_FUNDING_PERCENT, isolateLtr } from "../lib/campaign/funding";

const ROOT = join(__dirname, "..");

test("decodeRouteParam decodes Arabic slugs and leaves others alone", () => {
  const encoded = "%D9%85%D8%B4%D8%B1%D9%88%D8%B9-%D8%A7%D8%B7%D8%B9%D8%A7%D9%85";
  assert.equal(decodeRouteParam(encoded), "مشروع-اطعام");
  assert.equal(decodeRouteParam("food-distribution-in-gaza"), "food-distribution-in-gaza");
  assert.equal(decodeRouteParam("6aede5628bb3fa5dd6fa267d"), "6aede5628bb3fa5dd6fa267d");
  assert.equal(decodeRouteParam("bad%E0%A4%A"), "bad%E0%A4%A"); // malformed → unchanged
});

test("amounts keep their order inside RTL text", () => {
  assert.equal(isolateLtr("$50"), "⁦$50⁩");
  assert.equal(LOW_FUNDING_PERCENT, 10);
});

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?)$/.test(name)) out.push(p);
  }
  return out;
}

test("public UI renders no donor counts", () => {
  const files = [
    ...walk(join(ROOT, "app", "[locale]")),
    ...walk(join(ROOT, "components")).filter((f) => !f.includes(`${join("components", "dashboard")}`)),
  ].filter((f) => !/CampaignsDisplay\.tsx$|campaign[\\/]_components[\\/]MainPage\.tsx$/.test(f)); // unused legacy files
  const offenders = files.filter((f) => {
    const src = readFileSync(f, "utf8");
    return /\{\s*campaign\.donationCount[^}]*\}/.test(src) || /donorsSoFar|tr\("donors"/.test(src);
  });
  assert.deepEqual(offenders, []);
});

test("design ships no new image files", () => {
  assert.equal(existsSync(join(ROOT, "public", "brand")), false);
});

test("new strings exist in ar, en and tr", () => {
  const needed = {
    Brand: ["donateNow", "footerCtaTitle", "footerCtaText", "since", "home", "beFirst", "goal", "chooseAmount"],
    HomeRedesign: ["badge", "titleTop", "titleMark", "subtitle", "qdTitle", "worldsTitle", "w1", "w7s", "howMark", "t1", "banksLabel"],
  } as const;
  for (const locale of ["ar", "en", "tr"]) {
    const msgs = JSON.parse(readFileSync(join(ROOT, "i18n", "messages", `${locale}.json`), "utf8"));
    for (const [ns, keys] of Object.entries(needed)) {
      for (const k of keys) assert.ok(typeof msgs[ns]?.[k] === "string", `${locale}.${ns}.${k}`);
    }
  }
});
