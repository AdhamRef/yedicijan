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
