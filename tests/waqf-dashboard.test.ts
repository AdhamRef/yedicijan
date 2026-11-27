// Waqf funds dashboard: input validation, permissions wiring, page integration.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanImage, cleanShareUSD, parseFundInput, parseSettingsInput, toFundDTO, WAQF_MIN_SHARE_USD } from "../lib/waqf/config";
import { pathToDashboardPermission, isDashboardPermissionKey } from "../lib/dashboard/permissions";

const read = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");

test("share price never below 50; images only https or bundled", () => {
  assert.equal(cleanShareUSD(10, null), WAQF_MIN_SHARE_USD);
  assert.equal(cleanShareUSD("120", null), 120);
  assert.equal(cleanShareUSD("", null), null);
  assert.equal(cleanImage("https://res.cloudinary.com/x/a.jpg"), "https://res.cloudinary.com/x/a.jpg");
  assert.equal(cleanImage("/images/zakat-waqf/wq-well.jpg"), "/images/zakat-waqf/wq-well.jpg");
  assert.equal(cleanImage("javascript:alert(1)"), null);
  assert.equal(cleanImage("http://insecure.example/a.jpg"), null);
});

test("fund input: Arabic name required, kind checked, ids cleaned, texts trimmed", () => {
  assert.deepEqual(parseFundInput({ kind: "water", texts: { en: { name: "Water" } } }), { error: "اسم الصندوق بالعربية مطلوب" });
  assert.deepEqual(parseFundInput({ kind: "nope", texts: { ar: { name: "س" } } }), { error: "نوع الصندوق غير صحيح" });
  const r = parseFundInput({
    kind: "energy", shareUSD: 20, featured: true, campaignIds: ["6b06b1ac01941fc8234d5fa8", "bad", "6b06b1ac01941fc8234d5fa8"],
    texts: { ar: { name: "  صندوق الطاقة ", description: "x".repeat(500), badge: "جديد" }, xx: { name: "ignored" } },
  });
  assert.ok("fund" in r);
  if ("fund" in r) {
    assert.equal(r.fund.shareUSD, 50);
    assert.deepEqual(r.fund.campaignIds, ["6b06b1ac01941fc8234d5fa8"]);
    assert.equal(r.fund.texts.ar?.name, "صندوق الطاقة");
    assert.equal(r.fund.texts.ar?.description.length, 240);
    assert.equal(Object.keys(r.fund.texts).join(), "ar");
    assert.equal(r.fund.featured, true);
  }
});

test("settings input: chips sorted, unique, at most six; defaults kept", () => {
  const s = parseSettingsInput({ shareUSD: 5, quickShares: [10, 1, 3, 3, -2, 5000, 7, 2, 4, 6], showDesignated: false });
  assert.equal(s.shareUSD, 50);
  assert.deepEqual(s.quickShares, [1, 2, 3, 4, 6, 7]);
  assert.equal(s.showDesignated, false);
  assert.deepEqual(parseSettingsInput({}).quickShares, [1, 3, 5, 10]);
  assert.equal(toFundDTO({ id: "a", kind: "weird", texts: null }).kind, "general");
});

test("dashboard: own permission, route rule, nav entry; APIs behind it", () => {
  assert.ok(isDashboardPermissionKey("waqf"));
  assert.equal(pathToDashboardPermission("/dashboard/waqf"), "waqf");
  assert.match(read("lib/dashboard/nav-config.ts"), /href: "\/dashboard\/waqf"/);
  assert.match(read("lib/waqf/api.ts"), /requireAdminOrDashboardPermission\(session, "waqf"\)/);
  for (const f of ["app/api/waqf/admin/route.ts", "app/api/waqf/settings/route.ts", "app/api/waqf/funds/route.ts", "app/api/waqf/funds/[id]/route.ts", "app/api/waqf/funds/reorder/route.ts", "app/api/waqf/funds/seed/route.ts"]) {
    assert.match(read(f), /await waqfAdmin\(\)/, f);
  }
  // Only the two new collections; no donations, payments or existing tables.
  const db = read("lib/waqf/db.ts");
  assert.doesNotMatch(db, /prisma\.(donation|campaign|category|globalSettings|user)\b/);
  assert.match(db, /prisma as unknown as \{ waqfFund: Delegate; waqfPageSettings: Delegate \}/);
  const schema = read("prisma/schema.prisma");
  assert.match(schema, /model WaqfPageSettings \{/);
  assert.match(schema, /model WaqfFund \{/);
});

test("waqf page: dashboard funds win, built-in funds otherwise; settings applied", () => {
  const page = read("app/[locale]/waqf/_components/WaqfPageContent.tsx");
  assert.match(page, /axios\.get\(`\/api\/waqf`\)/);
  assert.match(page, /if \(config\?\.funds\.length\)/);
  assert.match(page, /settings\?\.heroImage \?\?/);
  assert.match(page, /settings\?\.storyImage \?\?/);
  assert.match(page, /filter\(\(\[m\]\) => m === "general" \|\| showDesignated\)/);
  assert.match(page, /settings!\.quickShares/);
  assert.doesNotMatch(page, /\/api\/categories\/waqf`/);
});
