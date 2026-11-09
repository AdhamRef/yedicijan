import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const table = "app/(dashboard)/dashboard/communication/campaigns/_components/CampaignsTable.tsx";
const actions = "app/(dashboard)/dashboard/communication/campaigns/_components/CampaignRowActions.tsx";

function extractHandler(file, jsxTag, predicate = () => true) {
  const sourceText = readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const handlers = [];
  function walk(node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(ast) === jsxTag && predicate(node, ast)) {
      const prop = node.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(ast) === "onClick");
      if (prop && ts.isJsxAttribute(prop) && prop.initializer && ts.isJsxExpression(prop.initializer)) {
        handlers.push(prop.initializer.expression.getText(ast));
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(ast);
  assert.equal(handlers.length, 1, `Expected one ${jsxTag} click handler in ${file}`);
  return handlers[0];
}
function evaluate(expression, context = {}) {
  const code = ts.transpileModule("module.exports = " + expression, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: null };
  vm.runInNewContext(code, { module, ...context });
  assert.equal(typeof module.exports, "function");
  return module.exports;
}

test("actual campaign table navigates only for row background clicks", () => {
  let navigationCount = 0;
  const click = evaluate(extractHandler(table, "tr", (node, source) => node.attributes.properties.some(
    p => ts.isJsxAttribute(p) && p.name.getText(source) === "onClick"
  )), { router: { push: () => navigationCount++ }, href: "/dashboard/communication/email?campaign=fixture" });
  const currentTarget = { contains: target => Boolean(target.inside) };
  const event = (inside, interactive) => ({
    currentTarget,
    target: { inside, closest: () => interactive ? { nodeName: "BUTTON" } : null },
  });
  click(event(true, false));
  assert.equal(navigationCount, 1, "genuine table row click navigates");
  click(event(false, false));
  click(event(true, true));
  assert.equal(navigationCount, 1, "portalled dialog and interactive elements must not navigate");
});

test("campaign actions own their click boundary and stop React portal bubbling", () => {
  const content = readFileSync(actions, "utf8");
  const elementName = content.includes('onClick={event => event.stopPropagation()}') && content.includes('className="flex items-center justify-end gap-1.5"') ? "div" : "AlertDialogContent";
  const predicate = elementName === "div" ? (node, source) => node.attributes.properties.some(p =>
    ts.isJsxAttribute(p) && p.name.getText(source) === "className" && p.initializer?.getText(source).includes("justify-end gap-1.5")
  ) : () => true;
  const click = evaluate(extractHandler(actions, elementName, predicate));
  let stopped = 0;
  click({ stopPropagation: () => stopped++ });
  assert.equal(stopped, 1);
});
