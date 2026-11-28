// Speed and QA fixes: language/direction from the server, no oversized Link header (502),
// canonical host, the brand seal spins in Arabic too, deferred third parties, a11y fixes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

test("one root document per area: <html lang dir> from the [locale] param, not a guess", () => {
  const doc = read("components/root/RootDocument.tsx");
  assert.match(doc, /<html lang=\{lang\} dir=\{localeDirection\(lang\)\}/);
  assert.doesNotMatch(doc, /getLocale/);
  assert.doesNotMatch(doc, /content="Arabic"/);
  assert.ok(!existsSync(join(root, "app/layout.tsx")), "no top-level root layout: it could not know the language");
  const loc = read("app/[locale]/layout.tsx");
  assert.match(loc, /<RootDocument locale=\{locale\}>/);
  assert.match(loc, /\.\.\.rootMetadata,/);
  for (const p of ["app/(dashboard)/layout.tsx", "app/auth/layout.tsx"]) {
    assert.match(read(p), /<RootDocument locale="ar">/, p);
  }
});

test("root document: no render-blocking or 404 scripts in the head", () => {
  const l = read("components/root/RootDocument.tsx");
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

test("CSS not inlined (245 KB twice per page), main keeps the viewport height", () => {
  assert.doesNotMatch(read("next.config.ts"), /inlineCss: true/);
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

test("live ticker: no active ticker is 200 { active: false }, not a 404 logged in every browser", () => {
  const r = read("app/api/live-donation-ticker/route.ts");
  assert.match(r, /return NextResponse\.json\(\{ active: false \}\);/);
  assert.doesNotMatch(r, /No active ticker configuration found/);
  const t = read("components/LiveDonationsTicker.tsx");
  assert.match(t, /if \(!data\?\.id\) \{\s*setError\("inactive"\);/);
  // The dashboard form stays empty instead of reading fields of { active: false }.
  assert.match(read("app/(dashboard)/dashboard/ticker/page.tsx"), /if \(data\?\.id\) \{/);
});

test("hero: only the first photo until the visitor interacts; grid columns ignore min-content", () => {
  const h = read("app/[locale]/_components/homepage/HomeHero.tsx");
  assert.match(h, /\(rotating \? main : main\.slice\(0, 1\)\)\.map/);
  assert.match(h, /\["scroll", "pointerdown", "keydown", "touchstart"\]/);
  assert.match(h, /lg:grid-cols-\[minmax\(0,1\.02fr\)_minmax\(0,\.98fr\)\]/);
});

test("homepage photos at their shown size (Cloudinary), the upload SDK module untouched", () => {
  const how = read("app/[locale]/_components/homepage/HowItWorks.tsx");
  assert.match(how, /src=\{cld\(a, 900\)\}/);
  assert.match(how, /src=\{cld\(b, 600\)\}/);
  assert.match(read("app/[locale]/_components/homepage/HomePageContent.tsx"), /src=\{cld\(post\.image, 800\)\}/);
  assert.match(read("lib/cloudinary-url.ts"), /f_auto,q_auto,w_\$\{width\},c_limit/);
  assert.match(read("lib/cloudinary.ts"), /export default cloudinary/);
});

test("llms.txt exists", () => {
  assert.ok(existsSync(join(root, "public/llms.txt")));
});
