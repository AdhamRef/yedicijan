// Homepage on phones: no horizontal overflow from the quick-donate band; the seven fields keep their orbit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");

test("quick-donate band: one column on phones, children may shrink", () => {
  const band = read("app/[locale]/_components/homepage/QuickDonateBand.tsx");
  assert.match(band, /className="grid grid-cols-1 items-end gap-5 lg:grid-cols-\[auto_minmax\(0,1fr\)_minmax\(0,1\.9fr\)_auto\]/);
  assert.match(band, /<div ref=\{menuRef\} className="relative min-w-0">/);
  assert.match(band, /<fieldset className="min-w-0">/);
});

test("seven fields: the orbit on every screen, no phone grid", () => {
  const worlds = read("app/[locale]/_components/homepage/SevenWorlds.tsx");
  assert.match(worlds, /<ul className="relative mx-auto aspect-square w-full max-w-\[370px\] sm:max-w-\[560px\]">/);
  assert.doesNotMatch(worlds, /grid grid-cols-2 gap-2\.5/);
  assert.match(worlds, /left: `\$\{50 \+ 40 \* Math\.cos\(a\)\}%`/);
});

test("photo page heroes stay readable on phones", () => {
  const hero = read("components/brand/PageHero.tsx");
  // An even wash on phones; the side gradient only from md up.
  assert.match(hero, /bg-gradient-to-b from-deep\/25 via-deep\/55 to-deep md:hidden/);
  assert.match(hero, /hidden bg-gradient-to-l from-deep via-deep\/80 to-deep\/30 rtl:bg-gradient-to-r md:block/);
});

test("phones: zakat and waqf bar above the header, content offset to match", () => {
  const nav = read("components/Navbar.tsx");
  assert.match(nav, /grid h-9 grid-cols-2 bg-deep[^"]*lg:hidden/);
  assert.match(read("app/[locale]/layout.tsx"), /<main className="min-h-\[100svh\] pt-\[100px\] lg:pt-\[116px\]">/);
  assert.doesNotMatch(nav, /100dvh-4rem/);
});

test("projects page: compact category row, field photo, no badge in the hero", () => {
  const page = read("app/[locale]/_components/CampaignsPageContent.tsx");
  assert.match(page, /flex gap-1 overflow-x-auto/);
  assert.doesNotMatch(page, /publicBenefitAssociation/);
  assert.doesNotMatch(page, /CategorySelect/);
  assert.match(read("app/[locale]/campaigns/page.tsx"), /heroImage=\{fieldPhoto \?\? heroImage\}/);
});
