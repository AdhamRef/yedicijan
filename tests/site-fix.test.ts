// Header links stay on one line at 1024–1279px; campaign cards offer "other amount" and always show progress for fixed goals.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

test("desktop nav links never wrap onto two lines", () => {
  const nav = read("components/Navbar.tsx");
  assert.match(nav, /group relative whitespace-nowrap px-2 xl:px-3/);
  assert.match(nav, /hidden lg:flex items-center gap-0 xl:gap-1 flex-1 min-w-0/);
});

test("campaign card has an other-amount chip that opens checkout without a preset", () => {
  const card = read("app/[locale]/_components/CampaignCard.tsx");
  assert.match(card, /data-other-amount\s+onClick=\{\(e\) => handleDonateClick\(e\)\}/);
  assert.match(card, /\{th\("otherAmount"\)\}/);
  for (const l of ["ar", "en", "tr"]) {
    const m = JSON.parse(read(`i18n/messages/${l}.json`));
    assert.ok(m.HomeRedesign?.otherAmount, `${l}: HomeRedesign.otherAmount`);
  }
});

test("fixed-goal cards always render a progress bar", () => {
  const card = read("app/[locale]/_components/CampaignCard.tsx");
  assert.match(card, /data-card-progress/);
  assert.doesNotMatch(card, /progress < LOW_FUNDING_PERCENT/);
  assert.match(card, /raised > 0 \? Math\.max\(progress, 2\) : 0/);
});
