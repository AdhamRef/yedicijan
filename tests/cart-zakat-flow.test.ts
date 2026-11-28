// Cart lines for projects and categories, multi-country zakat, waqf to cart, a two-step donation dialog.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCartLine } from "../lib/cart/parse";
import { linePayload, lineTitle } from "../lib/cart/line";
import { donationProviderWhere } from "../lib/dashboard/donation-provider-filter";

const read = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");
const ID = "6b06b1ac01941fc8234d5fa8";

test("a cart line is a project or a category, never both or neither", () => {
  assert.ok("error" in parseCartLine({ amount: 5, amountUSD: 5, currency: "USD" }));
  assert.ok("error" in parseCartLine({ campaignId: ID, categoryId: ID, amount: 5, amountUSD: 5, currency: "USD" }));
  assert.ok("error" in parseCartLine({ categoryId: ID, amount: 0, amountUSD: 5, currency: "USD" }));
  const r = parseCartLine({ categoryId: ID, amount: 125, amountUSD: 125, currency: "usd", label: "زكاة المال — فلسطين · الغذاء", shareCount: 0 });
  assert.ok("line" in r);
  if ("line" in r) {
    assert.equal(r.line.categoryId, ID);
    assert.equal(r.line.currency, "USD");
    assert.equal(r.line.label, "زكاة المال — فلسطين · الغذاء");
    assert.ok(!("shareCount" in r.line));
  }
});

test("checkout payload and title work for both kinds", () => {
  assert.deepEqual(linePayload({ id: "x", amount: 10, category: { id: ID, name: "غزة" } }, 10), { categoryId: ID, amount: 10, amountUSD: 10 });
  assert.deepEqual(linePayload({ id: "x", amount: 100, shareCount: 2, campaign: { id: ID, title: "بئر" } }, 100), { campaignId: ID, amount: 100, amountUSD: 100, shareCount: 2 });
  assert.equal(lineTitle({ id: "x", amount: 1, label: "زكاة", category: { id: ID, name: "غزة" } }, "ar"), "زكاة");
  assert.equal(lineTitle({ id: "x", amount: 1, category: { id: ID, name: "Gaza", translations: [{ locale: "ar", name: "غزة" }] } }, "ar"), "غزة");
});

test("cart API and checkout accept category lines; a donor can remove their own line", () => {
  assert.match(read("prisma/schema.prisma"), /categoryId String\?  @db\.ObjectId/);
  const pay = read("app/api/cart/payment/route.ts");
  assert.match(pay, /categoryItems: \{ create: categoryItemsResolved \}/);
  assert.match(pay, /One or more categories not found/);
  const del = read("app/api/cart/[id]/route.ts");
  assert.match(del, /if \(cartItem\.userId === session\.user\.id\)/);
});

test("zakat: several countries and fields, split evenly, one cart line per country", () => {
  const z = read("app/[locale]/zakat/_components/ZakatPageContent.tsx");
  assert.match(z, /const toggleDest = /);
  assert.match(z, /const toggleField = /);
  assert.match(z, /const perCountry = Math\.floor\(\(payAmount \/ selectedDests\.length\) \* 100\) \/ 100;/);
  assert.match(z, /window\.dispatchEvent\(new CustomEvent\(CART_OPEN_EVENT\)\)/);
});

test("waqf: add to cart from the panel and the phone bar", () => {
  const w = read("app/[locale]/waqf/_components/WaqfPageContent.tsx");
  assert.equal((w.match(/onClick=\{addToCart\}/g) ?? []).length, 2);
  assert.match(w, /addLineToCart\(/);
});

test("cart button lights up; WhatsApp button; guest cart survives reload", () => {
  const nav = read("components/Navbar.tsx");
  assert.match(nav, /window\.addEventListener\(CART_ADDED_EVENT, onAdded\)/);
  assert.match(nav, /cartCount > 0\n\s+\? "border-gold bg-gold/);
  assert.match(read("app/[locale]/layout.tsx"), /<WhatsAppButton \/>/);
  assert.match(read("hooks/useCart.ts"), /name: 'yc-guest-cart'/);
});

test("donation dialog: two steps, team support optional on the amount screen", () => {
  const d = read("components/DonationDialog.tsx");
  const steps = d.slice(d.indexOf("const DONATION_STEPS"), d.indexOf("];", d.indexOf("const DONATION_STEPS")));
  assert.equal((steps.match(/\{ title:/g) ?? []).length, 2);
  assert.match(d, /useState<number \| null>\(0\)/);
  assert.match(d, /t\("donateAmount"/);
  assert.doesNotMatch(d, /window\.location\.reload\(\)/);
  assert.match(read("app/[locale]/layout.tsx"), /<PreloadCheckout \/>/);
});

test("dashboard gateway filter", () => {
  assert.deepEqual(donationProviderWhere("PAYFOR"), { provider: "PAYFOR" });
  assert.equal(donationProviderWhere("all"), null);
  assert.deepEqual(donationProviderWhere("ALBARAKA,PAYFOR"), { OR: [{ provider: "ALBARAKA" }, { provider: "PAYFOR" }] });
  assert.match(read("app/(dashboard)/dashboard/page.tsx"), /label="بوابة الدفع"/);
});

test("logic review: strict cart lines, choices saved on the donation, dialog resets on close", () => {
  const pay = read("app/api/cart/payment/route.ts");
  assert.match(pay, /isProject\(l\) === isCategory\(l\)/);
  assert.match(pay, /comment: lineNotes\.join\(" \| "\)/);
  assert.deepEqual(linePayload({ id: "x", amount: 5, label: "زكاة المال — غزة · الغذاء", category: { id: ID, name: "غزة" } }, 5), { categoryId: ID, amount: 5, amountUSD: 5, label: "زكاة المال — غزة · الغذاء" });
  const api = read("app/api/donations/route.ts");
  assert.match(api, /comment: note\.replace/);
  const d = read("components/DonationDialog.tsx");
  assert.match(d, /if \(note\) donationData\.note = note;/);
  assert.match(d, /setCurrentStep\(0\);\n\s+setDonationAmount\(0\);\n\s+setTeamSupport\(0\);/);
  const z = read("app/[locale]/zakat/_components/ZakatPageContent.tsx");
  assert.equal((z.match(/note=\{`\$\{t\("navLabel"\)\}/g) ?? []).length, 2);
  const w = read("app/[locale]/waqf/_components/WaqfPageContent.tsx");
  assert.equal((w.match(/note=\{waqfNote\}/g) ?? []).length, 2);
  assert.doesNotMatch(w, /t\(`fund_\$\{fund\.key\}`\)/);
});
