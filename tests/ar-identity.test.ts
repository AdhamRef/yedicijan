// Arabic identity: the organisation is «الهيئة الدولية للإغاثة الإنسانية» in Arabic,
// and the homepage no longer relies on the "Seven Worlds" metaphor Arab donors don't read.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const ORG = "الهيئة الدولية للإغاثة الإنسانية";

test("Arabic messages use the Arabic organisation name, not the old one", () => {
  const ar = read("i18n/messages/ar.json");
  assert.ok(!ar.includes("يدي جيهان"), "old Arabic name left in ar.json");
  assert.ok(!/العوالم السبعة|سبعة عوالم/.test(ar), "Seven Worlds wording left in ar.json");
  const m = JSON.parse(ar);
  assert.ok(m.Footer.description.startsWith(ORG));
  assert.equal(m.HomeRedesign.titleMark, "حيث الحاجة");
});

test("runtime Arabic corrections and metadata carry the new name", () => {
  assert.ok(read("i18n/message-quality.ts").includes(`"Footer.description": "${ORG}`));
  const seo = read("lib/seo.ts");
  assert.ok(seo.includes(`siteName: "${ORG}"`));
  assert.ok(!seo.includes("منذ 2011") && !seo.includes("تأسست 2011"), "wrong founding year in Arabic SEO");
  const layout = read("components/root/RootDocument.tsx");
  assert.ok(layout.includes(`template: "%s | ${ORG}"`));
  assert.match(layout, /alternateName: \[[^\]]*"يدي جيهان"/, "old name kept as alternate for search");
});
