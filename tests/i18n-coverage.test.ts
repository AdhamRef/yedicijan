// Every locale carries every key that English has, the homepage title is complete in each
// language (an empty part fell back to English: "Bağışınız ulaşır the yedi cihana"), and no
// sentence is left in English outside a short list of placeholders and proper names.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const LOCALES = ["ar", "en", "tr", "fr", "de", "es", "id", "pt"] as const;
type Msgs = Record<string, unknown>;
const load = (l: string): Msgs => JSON.parse(readFileSync(join(ROOT, "i18n", "messages", `${l}.json`), "utf8"));
const flat = (o: Msgs, p = ""): Record<string, string> =>
  Object.entries(o).reduce<Record<string, string>>((acc, [k, v]) => {
    if (v && typeof v === "object") Object.assign(acc, flat(v as Msgs, `${p}${k}.`));
    else acc[`${p}${k}`] = String(v);
    return acc;
  }, {});

const en = flat(load("en"));
const SAME_OK = new Set([
  "ContactUs.phonePlaceholder", "ContactUs.emailPlaceholder", "DonationDialog.cardNumberPlaceholder",
  "Footer.namePlaceholder", "Profile.settings.notifications", "HomeRedesign.w7s", "HomeRedesign.cAsia",
]);

for (const l of LOCALES) {
  test(`${l}: complete, no empty strings, nothing left in English`, () => {
    const m = flat(load(l));
    const missing = Object.keys(en).filter((k) => !(k in m));
    assert.deepEqual(missing, [], `${l} missing keys`);
    for (const k of ["HomeRedesign.titleTop", "HomeRedesign.titleTo", "HomeRedesign.titleMark"]) {
      assert.ok(m[k]?.trim(), `${l}.${k} must not be empty`);
    }
    if (l !== "en") {
      const english = Object.keys(en).filter((k) => !SAME_OK.has(k) && en[k].length > 12 && m[k] === en[k]);
      assert.deepEqual(english, [], `${l} still in English`);
    }
    const worlds = /seven worlds|العوالم السبعة|sept mondes|sieben Welten|siete mundos|tujuh dunia|sete mundos/i;
    assert.ok(!worlds.test(JSON.stringify(load(l).HomeRedesign)), `${l}: Seven Worlds wording`);
  });
}
