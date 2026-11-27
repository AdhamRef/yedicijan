// Header: zakat and waqf links beside the projects; bank accounts only in the top bar on desktop.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const nav = readFileSync(join(__dirname, "..", "components/Navbar.tsx"), "utf8");

test("zakat and waqf links follow the projects link, with icons", () => {
  const i = nav.indexOf('{ href: "/campaigns"');
  assert.ok(i > 0 && nav.indexOf('{ href: "/zakat", label: tZakat("navLabel"), Icon: Calculator }') > i);
  assert.ok(nav.indexOf('{ href: "/waqf", label: tWaqf("navLabel"), Icon: InfinityIcon }') > i);
});

test("bank accounts leave the desktop row but stay in the mobile menu and top bar", () => {
  assert.match(nav, /\{ href: "\/bank-transfer", label: t\("bankAccounts"\), desktop: false \}/);
  assert.match(nav, /navLinks\.filter\(\(link\) => link\.desktop !== false\)/);
  assert.match(nav, /href="\/bank-transfer"\s+className="ms-3 ps-3 border-s/);
});

test("mobile menu shows zakat and waqf as two tiles first", () => {
  assert.match(nav, /navLinks\.filter\(\(link\) => link\.Icon\)/);
  assert.match(nav, /navLinks\.filter\(\(link\) => !link\.Icon\)/);
});
