// Speed and QA fixes: language/direction from the server, no oversized Link header (502),
// canonical host, the brand seal spins in Arabic too, deferred third parties, a11y fixes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

test("root layout: lang and dir come from the request locale, not hard-coded ar/rtl", () => {
  const l = read("app/layout.tsx");
  assert.match(l, /export default async function RootLayout/);
  assert.match(l, /await getLocale\(\)/);
  assert.match(l, /<html lang=\{locale\} dir=\{localeDirection\(locale\)\}/);
  assert.doesNotMatch(l, /<html lang="ar" dir="rtl"/);
  assert.doesNotMatch(l, /content="Arabic"/);
});

test("root layout: no render-blocking or 404 scripts in the head", () => {
  const l = read("app/layout.tsx");
  assert.doesNotMatch(l, /contentsquare/);
  assert.doesNotMatch(l, /@vercel\/analytics/);
  assert.doesNotMatch(l, /\/bg\.webp/);
  const gtm = read("components/DeferredGTM.tsx");
  assert.match(gtm, /t\.contentsquare\.net\/uxa\/e81365186c19c\.js/);
  for (const p of ["app/[locale]/layout.tsx", "app/(dashboard)/dashboard/DashboardLayoutClient.tsx"]) {
    assert.doesNotMatch(read(p), /@vercel\/(analytics|speed-insights)/, p);
  }
});

test("middleware: no hreflang Link header (it overflowed nginx on long Arabic slugs → 502)", () => {
  const m = read("middleware.ts");
  assert.match(m, /alternateLinks: false/);
});

test("middleware: canonical host redirect only for the www/apex twin and only when auth host matches", () => {
  const m = read("middleware.ts");
  assert.match(m, /if \(new URL\(auth\)\.host !== target\.host\) return null;/);
  assert.match(m, /host\.replace\(\/\^www\\\.\/, ''\) !== target\.host\.replace\(\/\^www\\\.\/, ''\)/);
  assert.match(m, /NextResponse\.redirect\(url, 308\)/);
  // Runs before anything else in the middleware.
  const body = m.slice(m.indexOf("export default function middleware"));
  assert.ok(body.indexOf("canonicalHostRedirect(req)") < body.indexOf("intl("));
});

test("hero: the seal spins on an HTML wrapper with an LTR svg (Safari ignores it on RTL svg)", () => {
  const h = read("app/[locale]/_components/homepage/HomeHero.tsx");
  assert.match(h, /className="brand-spin[^"]*"/);
  assert.match(h, /<svg[^>]*direction="ltr"/);
  const css = read("app/[locale]/globals.css");
  assert.match(css, /\.brand-spin \{[^}]*animation: brand-spin 28s linear infinite;/);
});

test("hero: LCP image preloaded with high priority and responsive sizes", () => {
  const h = read("app/[locale]/_components/homepage/HomeHero.tsx");
  assert.match(h, /preload\(/);
  assert.match(h, /fetchPriority: "high"/);
  assert.match(h, /srcSet=\{/);
  assert.match(h, /new Date\(\)\.getFullYear\(\) - 1961/);
});

test("CSS inlined, main keeps the viewport height so the footer does not jump", () => {
  assert.match(read("next.config.ts"), /inlineCss: true/);
  assert.match(read("app/[locale]/layout.tsx"), /min-h-\[100svh\]/);
});

test("a11y: footer heading order, bank copy buttons named, quick-donate contrast", () => {
  const f = read("components/Footer.tsx");
  assert.doesNotMatch(f, /<h4/);
  const b = read("app/[locale]/bank-transfer/_components/BankAccountsBlock.tsx");
  assert.match(b, /type="button"/);
  assert.match(b, /aria-label=\{/);
  const q = read("app/[locale]/_components/homepage/QuickDonateBand.tsx");
  assert.doesNotMatch(q, /text-ice\/60/);
});

test("live ticker: an inactive ticker (404) is quiet", () => {
  const t = read("components/LiveDonationsTicker.tsx");
  assert.match(t, /setError\("inactive"\)/);
});

test("llms.txt exists", () => {
  assert.ok(existsSync(join(root, "public/llms.txt")));
});
