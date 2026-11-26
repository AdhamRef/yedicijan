import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
// Ported from Minber al-Aqsa #291, on Yedicihan's own dashboard shell classes.
test("on phones the dashboard page fits the screen: tab bars and wide content scroll inside the content area", () => {
  const css = fs.readFileSync("styles/dashboard-utilities.css", "utf8");
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /\.dash-shell \[role="tablist"\] \{ max-width: 100%; overflow-x: auto;/);
  assert.match(css, /\.dash-content \{ max-width: 100vw; overflow-x: auto; \}/);
  const shell = fs.readFileSync("app/(dashboard)/dashboard/DashboardLayoutClient.tsx", "utf8");
  assert.match(shell, /className=\{`dash-shell flex-1/);
  assert.match(shell, /<div className="dash-content /);
  assert.match(fs.readFileSync("app/(dashboard)/dashboard/layout.tsx", "utf8"), /import "@\/styles\/dashboard-utilities\.css";/);
});
