import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  donationCampaignWhere,
  donationCategoryWhere,
  donationCountryWhere,
  donationLocaleWhere,
  idOrIn,
} from "../../lib/dashboard/donation-multi-filter";
import { donationSourceWhere } from "../../lib/dashboard/donation-source-filter";

// Ported from Minber al-Aqsa #282 and adapted to Yedicihan's filters (no payment-gateway filter here).

test("one value gives exactly the condition it gave before", () => {
  assert.deepEqual(donationLocaleWhere("ar"), { locale: "ar" });
  assert.deepEqual(donationLocaleWhere("__unset"), { OR: [{ locale: null }, { locale: "" }] });
  assert.deepEqual(donationCountryWhere("tr"), { donorCountryCode: "TR" });
  assert.deepEqual(donationCountryWhere("__unset"), { OR: [{ donorCountryCode: null }, { donorCountryCode: "" }] });
  assert.deepEqual(donationSourceWhere("facebook"), { sourceChannel: "facebook" });
  assert.deepEqual(donationCampaignWhere("c1"), { items: { some: { campaignId: "c1" } } });
  assert.deepEqual(donationCategoryWhere("k1"), {
    OR: [{ items: { some: { campaign: { categoryIds: { has: "k1" } } } } }, { categoryItems: { some: { categoryId: "k1" } } }],
  });
  assert.equal(idOrIn("c1"), "c1");
  for (const fn of [donationLocaleWhere, donationCountryWhere, donationSourceWhere, donationCampaignWhere, donationCategoryWhere]) {
    assert.equal(fn("all"), null); assert.equal(fn(""), null); assert.equal(fn(null), null);
  }
});

test("several values mean any of them", () => {
  assert.deepEqual(donationCountryWhere("TR,AZ"), { OR: [{ donorCountryCode: "TR" }, { donorCountryCode: "AZ" }] });
  assert.deepEqual(donationLocaleWhere("ar,tr"), { OR: [{ locale: "ar" }, { locale: "tr" }] });
  assert.deepEqual(donationSourceWhere("facebook,instagram"), { sourceChannel: { in: ["facebook", "instagram"] } });
  assert.deepEqual(donationSourceWhere("facebook,bogus"), { sourceChannel: "facebook" }, "unknown values are ignored, as before");
  assert.deepEqual(donationCountryWhere("TR,TR"), { donorCountryCode: "TR" }, "duplicates collapse");
  assert.deepEqual(donationCampaignWhere("c1,c2"), { items: { some: { campaignId: { in: ["c1", "c2"] } } } });
  assert.deepEqual(donationCategoryWhere("k1,k2"), {
    OR: [{ items: { some: { campaign: { categoryIds: { hasSome: ["k1", "k2"] } } } } }, { categoryItems: { some: { categoryId: { in: ["k1", "k2"] } } } }],
  });
});

test("chart, KPIs, list and export read the shared multi-value builders; the page offers multi-pick filters", () => {
  for (const f of ["app/api/admin/donations/chart/route.ts", "app/api/admin/stats/route.ts", "app/api/donations/route.ts", "app/api/admin/donations/export/route.ts"]) {
    assert.match(fs.readFileSync(f, "utf8"), /@\/lib\/dashboard\/donation-multi-filter/, f);
  }
  const page = fs.readFileSync("app/(dashboard)/dashboard/page.tsx", "utf8");
  for (const label of ["الفئة", "المشروع", "مصدر التبرع", "لغة الموقع \\(التبرع\\)", "الدولة"]) {
    assert.match(page, new RegExp(`<MultiPick label="${label}"`), label);
  }
  // Several categories: a chosen project is kept only if it belongs to at least one of them.
  assert.match(page, /setSelectedCategory\(pickValue\(next\)\)/);
  assert.match(page, /setSelectedCampaign\(\(cur\) => pickValue\(pickList\(cur\)\.filter\(/);
});
