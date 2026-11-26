import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { isEmergencyAllowedPath, isPaymentStartRequest, isEmergencyMode, EMERGENCY_PAGE } from "../../lib/site-security/emergency-policy";
import { pauseTexts, requestLocale } from "../../lib/site-security/emergency-texts";
import { SUPPORTED_LOCALES } from "../../lib/locales";

// Ported from Minber al-Aqsa #239 and adapted to Yedicihan: its own gateways
// (Albaraka, PayFor), its eight site languages, and an Arabic-only dashboard.

test("payment starts are exactly the checkout POSTs; completions of started payments are not", () => {
  for (const p of ["/api/cart/payment", "/api/donations", "/api/albaraka/3d/initiate", "/api/payfor/3dpay/initiate"])
    assert.equal(isPaymentStartRequest("POST", p), true, p);
  for (const [m, p] of [["GET", "/api/donations"], ["POST", "/api/donations/6af674e2d1cd34cbb9de7d1a/fail"], ["POST", "/api/albaraka/3d/callback"],
    ["POST", "/api/payfor/3dpay/ok"], ["POST", "/api/payfor/3dpay/fail"], ["POST", "/api/cart"]])
    assert.equal(isPaymentStartRequest(m, p), false, `${m} ${p}`);
});

test("full closure keeps the dashboard, login, admin APIs, cron and every bank callback open", () => {
  for (const p of ["/dashboard/security", "/auth/signin", "/api/auth/session", "/api/admin/site-security/emergency", "/api/dashboard/x",
    "/api/cron/communication-run-due", "/api/albaraka/3d/callback", "/api/payfor/3dpay/ok", "/api/payfor/3dpay/fail", "/ar/success/6af674e2d1cd34cbb9de7d1a"])
    assert.equal(isEmergencyAllowedPath(p), true, p);
  for (const p of ["/", "/ar", "/tr/campaign/abc", "/api/global-settings", "/api/site-status"]) assert.equal(isEmergencyAllowedPath(p), false, p);
  assert.match(EMERGENCY_PAGE, /noindex/);
  assert.match(EMERGENCY_PAGE, /Yedicihan/);
  assert.doesNotMatch(EMERGENCY_PAGE, /Minber|منبر/);
  for (const l of SUPPORTED_LOCALES) assert.match(EMERGENCY_PAGE, new RegExp(`lang="${l}"`), l);
});

test("the donor sees the notice in every enabled site language; anything else reads English", () => {
  assert.match(pauseTexts("ar").refused, /التبرع متوقف مؤقتاً/); assert.match(pauseTexts("tr").banner, /Bağış/);
  assert.match(pauseTexts("fr").refused, /dons/);
  for (const l of SUPPORTED_LOCALES) if (l !== "en") assert.notEqual(pauseTexts(l), pauseTexts("en"), l);
  assert.equal(pauseTexts("ru"), pauseTexts("en")); assert.equal(pauseTexts(null), pauseTexts("en"));
  assert.equal(requestLocale("tr", null), "tr"); assert.equal(requestLocale(undefined, "https://www.yedicihan.org/fr/campaigns"), "fr");
  assert.equal(requestLocale(undefined, null), null);
  assert.equal(isEmergencyMode("DONATIONS"), true); assert.equal(isEmergencyMode("on"), false);
});

test("every payment start consults the switch first, lazily and fail-open; the state is cached and never closes by accident", () => {
  for (const f of ["app/api/cart/payment/route.ts", "app/api/donations/route.ts", "app/api/albaraka/3d/initiate/route.ts", "app/api/payfor/3dpay/initiate/route.ts"]) {
    const r = fs.readFileSync(f, "utf8");
    const post = r.indexOf("export async function POST");
    const check = r.indexOf('await import("@/lib/site-security/emergency").then((m) => m.emergencyResponse(', post);
    assert.ok(check > post && check < r.indexOf("try {", post), f + " checks the switch before anything else");
    assert.match(r, /emergencyResponse\(\w+\)\)\.catch\(\(\) => null\)/, f + " is fail-open");
    assert.doesNotMatch(r, /^import .*site-security\/emergency/m, f + " has no static import");
  }
  const e = fs.readFileSync("lib/site-security/emergency.ts", "utf8");
  assert.match(e, /return cached\?\.state \?\? OFF;/); assert.match(e, /expires: Date\.now\(\) \+ 5000/);
  assert.doesNotMatch(fs.readFileSync("lib/site-security/emergency-texts.ts", "utf8"), /^import /m, "browser-safe");
});

test("only admins switch, any closing needs the typed confirmation, every change is audited; route exports are valid", () => {
  const a = fs.readFileSync("app/api/admin/site-security/emergency/route.ts", "utf8");
  assert.equal((a.match(/requireAdminSession\(session\)/g) ?? []).length, 2);
  assert.match(a, /if \(body\.mode !== "OFF" && body\.confirm !== CONFIRM_TOKEN\)/);
  assert.match(a, /action: `SITE_EMERGENCY_\$\{body\.mode\}`/);
  for (const f of ["app/api/admin/site-security/emergency/route.ts", "app/api/site-status/route.ts"]) {
    const ex = [...fs.readFileSync(f, "utf8").matchAll(/^export (?:const|async function|function) (\w+)/gm)].map((m) => m[1]);
    assert.ok(ex.every((n) => ["GET", "POST", "dynamic"].includes(n)), f + ": " + ex);
  }
});

test("the banner sits at the top of every public page; the security page is admin-only", () => {
  assert.match(fs.readFileSync("app/[locale]/layout.tsx", "utf8"), /<main[^>]*>\s*<DonationPauseBanner locale=\{locale\} \/>\s*\{children\}/);
  const page = fs.readFileSync("app/(dashboard)/dashboard/security/page.tsx", "utf8");
  assert.match(page, /<EmergencySwitch \/>/);
  assert.match(page, /if \(session\?\.user\?\.role !== "ADMIN"\) redirect\("\/dashboard"\)/);
  assert.match(fs.readFileSync("lib/dashboard/nav-config.ts", "utf8"), /href: "\/dashboard\/security", icon: "shield", adminOnly: true/);
  assert.match(fs.readFileSync("app/api/site-status/route.ts", "utf8"), /siteClosed: mode === "SITE"/);
});
