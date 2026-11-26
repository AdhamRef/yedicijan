import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
// Ported from Minber al-Aqsa #262 with Yedicihan's own official name in its eight languages.
const src = fs.readFileSync("lib/communication/providers/email/client.ts", "utf8");
const start = src.indexOf("const INSTITUTION_SENDER_NAMES"), end = src.indexOf("export type EmailSendResult");
const js = ts.transpileModule(src.slice(start, end).replace("export function", "function") + "\nmodule.exports = { institutionSenderName };", { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod: { exports: { institutionSenderName: (l: string | null | undefined) => string | null } } = { exports: {} as never };
vm.runInNewContext(js, { module: mod });
const name = mod.exports.institutionSenderName;

test("the sender is the association's name in the message's language", () => {
  assert.equal(name("ar"), "جمعية يدي جيهان الدولية للتضامن");
  assert.equal(name("tr"), "Yedicihan Uluslararası Yardımlaşma Derneği");
  assert.equal(name("en"), "Yedicihan International Solidarity Association");
  assert.equal(name("tr-TR"), "Yedicihan Uluslararası Yardımlaşma Derneği");
  for (const l of ["ar", "en", "fr", "tr", "id", "pt", "es", "de"]) assert.match(name(l) ?? "", /Yedicihan|يدي جيهان/, l);
  assert.equal(name("ru"), "Yedicihan International Solidarity Association", "other languages: English form");
  assert.doesNotMatch(src.slice(start, end), /Minb|منبر/);
});

test("no language keeps the configured sender; an explicit sender name always wins; every e-mail path passes the language", () => {
  assert.equal(name(null), null);
  assert.equal(name(""), null);
  // #268: marketing campaigns keep the configured sender name; the localized name is for automatic messages.
  assert.match(src, /senderName: input\.senderName\?\.trim\(\) \|\| \(input\.purpose === "MARKETING" \? null : institutionSenderName\(input\.locale\)\) \|\| input\.senderName,/);
  assert.match(fs.readFileSync("lib/communication/provider-router.ts", "utf8"), /purpose: input\.purpose,\s*\}, bundle\.elasticEmail\)/);
  assert.match(fs.readFileSync("lib/communication/campaign-send-executor.ts", "utf8"), /locale: recipient\.locale, purpose, subject/);
  assert.match(fs.readFileSync("lib/communication/provider-router.ts", "utf8"), /locale: input\.locale,\s*\}, bundle\.elasticEmail\)/);
  assert.match(fs.readFileSync("lib/communication/automatic-message-dispatcher.ts", "utf8"), /html: input\.renderedBody,\s*locale: input\.locale,/);
  assert.match(fs.readFileSync("lib/communication/campaign-send-executor.ts", "utf8"), /locale: recipient\.locale, subject: rendered\.subject/);
  assert.match(fs.readFileSync("lib/communication/delivery-retry-service.ts", "utf8"), /html: row\.renderedBody,\s*locale: row\.locale,/);
});
