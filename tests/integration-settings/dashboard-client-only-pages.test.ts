import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
// This repo has no security page (Minber #242/#286 work); the communication-connections panel is the one here.
test("the communication-connections panel renders in the browser only (no #418 from differing ICU data)", () => {
  const c = fs.readFileSync("app/(dashboard)/dashboard/platform-connections/communication/page.tsx", "utf8");
  assert.match(c, /from "\.\/_components\/ClientOnly"/);
  const t = fs.readFileSync("app/(dashboard)/dashboard/platform-connections/communication/_components/ClientOnly.tsx", "utf8");
  assert.match(t, /^"use client";/);
  assert.equal((t.match(/ssr: false/g) ?? []).length, 1);
});
