import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
// Ported from Minber al-Aqsa #257 and adapted to Yedicihan's retry preflight.
const s = fs.readFileSync("lib/communication/delivery-retry-service.ts", "utf8");
const preflight = s.slice(s.indexOf("export async function retryPreflight"));
test("the preflight runs its three queries through the index-friendly path, loaded lazily with a Prisma fallback", () => {
  assert.match(s, /await import\("\.\/delivery-fast-query"\)/);
  assert.doesNotMatch(s, /^import .*delivery-fast-query/m, "no static import");
  const body = preflight.slice(0, preflight.indexOf("const counts = new Map"));
  assert.equal((body.match(/q\.(find|count)\(/g) ?? []).length, 3);
  assert.doesNotMatch(body, /prisma\.communicationDelivery\./);
});
test("the preflight still never downloads message bodies", () => {
  const body = preflight.slice(0, preflight.indexOf("const counts = new Map"));
  assert.match(body, /select: \{ errorMessage: true, createdAt: true \}/);
});
