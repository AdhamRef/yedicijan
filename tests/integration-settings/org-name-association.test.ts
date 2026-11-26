import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (l: string) => fs.readFileSync(`i18n/messages/${l}.json`, "utf8");
test("the organization is an association in every language (Yedicihan is a Dernek), not a foundation", () => {
  const banned: Record<string, RegExp> = { en: /\b[Ff]oundation(?!s|al)\b/, fr: /\b[Ff]ondation\b/, es: /\b[Ff]undaci[oó]n\b/, it: /\b[Ff]ondazione\b/, pt: /\b[Ff]unda[cç][aã]o\b/, de: /Stiftung/, nl: /\b[Ss]tichting/, sv: /\b[Ss]tiftelse/, no: /\b[Ss]tiftelse/, da: /\b[Ff]ondens\b|Kontakt fonden|Lær Fonden|Internationale Fond\b|tilhører fonden/, id: /\b[Yy]ayasan\b/, ms: /\b[Yy]ayasan\b/, sq: /\b[Ff]ondacion/, ja: /財団/, zh: /基金会/, ur: /فاؤنڈیشن/, hi: /फाउंडेशन|फ़ाउंडेशन/ };
  // Only the languages this site has.
  for (const [lang, re] of Object.entries(banned)) if (fs.existsSync(`i18n/messages/${lang}.json`)) assert.doesNotMatch(read(lang), re, lang);
  assert.doesNotMatch(read("tr"), /[Vv]akf[ıi]|[Vv]akıf/, "tr: never 'vakıf'");
});
