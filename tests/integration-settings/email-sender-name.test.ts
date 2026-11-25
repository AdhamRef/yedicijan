import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const src = fs.readFileSync("lib/communication/providers/email/client.ts", "utf8");
const start = src.indexOf("const INSTITUTION_SENDER_NAMES"), end = src.indexOf("export type EmailSendResult");
const js = ts.transpileModule(src.slice(start, end).replace("export function", "function") + "\nmodule.exports = { institutionSenderName };", { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod: { exports: { institutionSenderName: (l: string | null | undefined) => string | null } } = { exports: {} as never };
vm.runInNewContext(js, { module: mod });
const name = mod.exports.institutionSenderName;

test("the sender is the institution's name in the message's language", () => {
  assert.equal(name("ar"), "جمعية يدي جيهان الدولية للتضامن");
  assert.equal(name("tr"), "Yedicihan Uluslararası Yardımlaşma Derneği");
  assert.equal(name("en"), "Yedicihan International Solidarity Association");
  assert.equal(name("fr"), "Association Internationale de Solidarité Yedicihan");
  assert.equal(name("tr-TR"), "Yedicihan Uluslararası Yardımlaşma Derneği");
  assert.equal(name("de"), "Yedicihan Internationaler Solidaritätsverein");
  assert.equal(name("it"), "Yedicihan International Solidarity Association", "other languages: English form");
});

test("no language keeps the configured sender; an explicit sender name always wins", () => {
  assert.equal(name(null), null);
  assert.equal(name(""), null);
  assert.match(src, /senderName: input\.senderName\?\.trim\(\) \|\| \(input\.purpose === "MARKETING" \? null : institutionSenderName\(input\.locale\)\),/, "marketing keeps the configured sender");
});
