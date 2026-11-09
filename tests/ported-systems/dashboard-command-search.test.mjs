import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadFilter() {
  const code = ts.transpileModule(readFileSync("lib/dashboard/command-search.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports });
  return module.exports.dashboardCommandFilter;
}

test("search matches all terms in any order across permitted command labels and keywords", () => {
  const matches = loadFilter();
  const label = "WhatsApp campaign reports حملات التواصل";
  assert.equal(matches(label, "campaign WhatsApp"), 1);
  assert.equal(matches(label, "WHATSAPP   REPORTS"), 1);
  assert.equal(matches(label, "حملات التواصل"), 1);
  assert.equal(matches(label, "  "), 1);
  assert.equal(matches(label, "campaign payments"), 0);
  assert.equal(matches(label, "campaign campaign"), 1);
});

test("shared command list wires the filter and has accessible dialog title", () => {
  const component = readFileSync("components/ui/command.tsx", "utf8");
  assert.match(component, /filter=\{dashboardCommandFilter\}/);
  assert.match(component, /<DialogTitle className="sr-only">/);
  assert.match(component, /aria-describedby=\{undefined\}/);
});

test("command palette remains bound to permission-filtered navigation, not global route registry", () => {
  const palette = readFileSync("app/(dashboard)/dashboard/_shell/CommandPalette.tsx", "utf8");
  assert.match(palette, /navigation\.map\(\(section\)/);
  assert.match(palette, /section\.items\.map\(\(item\)/);
  assert.match(palette, /item\.keywords/);
});
