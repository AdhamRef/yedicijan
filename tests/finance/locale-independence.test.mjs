import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(resolve(root, p), "utf8");

// Pinned to YediCihan's *existing* enabled configuration on main db56006,
// NOT to Minberi Aksa's 19-language reference. An explicit product decision
// is required to change these values.
export const YEDICIHAN_ENABLED_LOCALES = Object.freeze([
  "ar", "en", "fr", "tr", "id", "pt", "es", "de",
]);
export const YEDICIHAN_DEFAULT_LOCALE = "ar";
export const YEDICIHAN_DISABLED_REGISTERED = Object.freeze(["sq", "it", "nl", "sv"]);

function readLiteralArray(source, name) {
  const pattern = new RegExp(
    "export\\s+const\\s+" + name + "\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as\\s+const",
  );
  const body = source.match(pattern)?.[1];
  if (body == null) throw new Error("Locale array " + name + " not found");
  return Array.from(body.matchAll(/["']([a-z]{2})["']/g), (m) => m[1]);
}

test("YediCihan enabled locales retain their exact eight-language order", () => {
  const file = read("lib/locales.ts");
  assert.deepEqual(readLiteralArray(file, "SUPPORTED_LOCALES"), YEDICIHAN_ENABLED_LOCALES);
  assert.deepEqual(readLiteralArray(file, "FUTURE_LOCALES"), YEDICIHAN_DISABLED_REGISTERED);
  assert.match(file, /export const DEFAULT_LOCALE:\s*SupportedLocale\s*=\s*"ar"/);
  for (const code of YEDICIHAN_DISABLED_REGISTERED) {
    assert.match(file, new RegExp("^\\s*" + code + ":\\s*\\{[^\\n]*enabled:\\s*false", "m"));
  }
});

test("public next-intl router inherits enabled locales and default, never the Minbar catalog", () => {
  const file = read("i18n/routing.config.ts");
  assert.match(file, /locales:\s*\[\.\.\.SUPPORTED_LOCALES\]/);
  assert.match(file, /defaultLocale:\s*DEFAULT_LOCALE/);
  const middleware = read("middleware.ts");
  assert.match(middleware, /const LOCALES\s*=\s*SUPPORTED_LOCALES/);
});

test("JSON translations match enabled set without extra published locales", () => {
  const names = readdirSync(resolve(root, "i18n/messages"))
    .filter((p) => p.endsWith(".json"))
    .map((p) => p.slice(0, -5));
  assert.deepEqual(names.sort(), [...YEDICIHAN_ENABLED_LOCALES].sort());
});

test("marketing locale set cannot gain languages not enabled for YediCihan", () => {
  const file = read("lib/marketing/locales-countries.ts");
  const codes = readLiteralArray(file, "SUPPORTED_MARKETING_LOCALES");
  assert.deepEqual(codes.slice().sort(), [...YEDICIHAN_ENABLED_LOCALES].sort());
});
