// Zakat arithmetic and the /zakat + /waqf pages' wiring.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { computeZakat, nisabValue } from "../lib/zakat/calc";

const ROOT = join(__dirname, "..");
const prices = { goldPerGram: 100, silverPerGram: 1 };

test("nisab by standard", () => {
  assert.equal(nisabValue("gold85", prices), 8500);
  assert.ok(Math.abs(nisabValue("goldDiyanet", prices) - 8018) < 1e-6);
  assert.equal(nisabValue("silver", prices), 595);
});

test("2.5% of net wealth once the nisab is reached, debts deducted, karat applied", () => {
  const r = computeZakat({ cash: 10000, goldGrams: 24, goldKarat: "18", debts: 1000 }, prices, "gold85");
  assert.equal(r.assets, 10000 + 24 * 0.75 * 100);
  assert.equal(r.net, 10800);
  assert.equal(r.reachesNisab, true);
  assert.equal(r.zakat, 270);
});

test("below the nisab nothing is due; silver nisab catches it", () => {
  const input = { cash: 5000 };
  assert.equal(computeZakat(input, prices, "gold85").zakat, 0);
  assert.equal(computeZakat(input, prices, "silver").zakat, 125);
});

test("negative or junk input never produces zakat", () => {
  const r = computeZakat({ cash: -500, investments: Number.NaN, debts: 99999 }, prices, "gold85");
  assert.equal(r.net, 0);
  assert.equal(r.zakat, 0);
});

test("pages exist, use the zakat / waqf categories and are linked from footer and sitemap", () => {
  const zakat = readFileSync(join(ROOT, "app/[locale]/zakat/_components/ZakatPageContent.tsx"), "utf8");
  const waqf = readFileSync(join(ROOT, "app/[locale]/waqf/_components/WaqfPageContent.tsx"), "utf8");
  assert.match(zakat, /c\.slug === "zakat"/);
  assert.match(waqf, /\/api\/categories\/waqf/);
  // The donation dialog is used as it is: these pages pass only props it already supports.
  assert.doesNotMatch(waqf, /initialShareCount/);
  assert.ok(existsSync(join(ROOT, "app/[locale]/zakat/page.tsx")) && existsSync(join(ROOT, "app/[locale]/waqf/page.tsx")));
  assert.match(readFileSync(join(ROOT, "components/Footer.tsx"), "utf8"), /href: '\/zakat'/);
  assert.match(readFileSync(join(ROOT, "app/sitemap.ts"), "utf8"), /"\/waqf"/);
  assert.doesNotMatch(readFileSync(join(ROOT, "components/DonationDialog.tsx"), "utf8"), /initialShareCount/);
});

test("waqf: designated projects come from the waqf category, every waqf is in shares of at least $50", () => {
  const waqf = readFileSync(join(ROOT, "app/[locale]/waqf/_components/WaqfPageContent.tsx"), "utf8");
  assert.match(waqf, /GENERAL_SHARE_USD = 50/);
  assert.match(waqf, /Math\.max\(GENERAL_SHARE_USD, Number\(c\.sharePriceUSD\)\)/);
  assert.match(waqf, /\/api\/categories\/\$\{encodeURIComponent\(cat\.slug\)\}\/campaigns/);
  assert.match(waqf, /WAQF_CATEGORY = /);
});

test("zakat: five destinations in the owner's order, calculator last", () => {
  const zakat = readFileSync(join(ROOT, "app/[locale]/zakat/_components/ZakatPageContent.tsx"), "utf8");
  const order = [...zakat.matchAll(/\{ key: "(palestine|sudan|yemen|africa|syria)"/g)].map((m) => m[1]);
  assert.deepEqual(order, ["palestine", "sudan", "yemen", "africa", "syria"]);
  assert.ok(zakat.indexOf('id="calc"') > zakat.indexOf("── FAQ ──"));
  assert.doesNotMatch(zakat, /notCalculated/);
});

test("pages stay complete before the zakat / waqf categories exist", () => {
  const zakat = readFileSync(join(ROOT, "app/[locale]/zakat/_components/ZakatPageContent.tsx"), "utf8");
  const waqf = readFileSync(join(ROOT, "app/[locale]/waqf/_components/WaqfPageContent.tsx"), "utf8");
  assert.match(zakat, /ZAKAT_CATEGORY = /);
  assert.match(zakat, /COUNTRY_WORDS\[dest\]/);
  assert.match(zakat, /"\/images\/zakat-waqf\/zk-baskets\.jpg"/);
  assert.match(zakat, /disabled=\{!canPress\}/);
  assert.match(zakat, /const canPress = canPay;/);
  assert.match(waqf, /WAQF_PROJECT\.test/);
  // General waqf stays: funds of $50 shares, each going to its open project (or the waqf category).
  assert.doesNotMatch(waqf, /setMode\("pick"\)/);
  assert.doesNotMatch(waqf, /\.filter\(\(\[m\]\)/);
  assert.match(waqf, /const FUNDS: /);
  assert.match(waqf, /giveCampaign = mode === "pick" \? target : fund\?\.project/);
  assert.match(waqf, /giveCategory = mode === "general" && !fund\?\.project \? category/);
  // Zakat pays into the country's category when there is no zakat category; never a dead button.
  assert.match(zakat, /COUNTRY_CATEGORY\[d\.key\]/);
  assert.match(zakat, /category \?\? countryCats\[dest\]/);
  // Payment on the site only: no WhatsApp hand-off, and a country without a target is not offered.
  assert.doesNotMatch(zakat, /wa\.me\/\$\{WHATSAPP\}\?text/);
  assert.doesNotMatch(zakat, /payWhatsapp/);
  assert.match(zakat, /const dests = DESTS\.filter\(\(d\) => !catsLoaded \|\| payable\(d\.key\)\)/);
  assert.doesNotMatch(zakat, /getElementById\("contact"\)\?\.scrollIntoView/);
  assert.match(waqf, /"\/images\/zakat-waqf\/wq-well\.jpg"/);
  for (const f of ["zk-baskets.jpg", "wq-well.jpg", "wq-mosque.jpg"]) assert.ok(existsSync(join(ROOT, "public/images/zakat-waqf", f)), f);
});
