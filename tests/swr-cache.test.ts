// Public-data cache: fresh hits, stale-while-revalidate, shared loads, errors never cached.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { swr, invalidatePublicCache, queryKey, cachedJson } from "../lib/server/swr-cache";

const read = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("fresh hits skip the load; concurrent misses share one load", async () => {
  invalidatePublicCache();
  let n = 0;
  const load = async () => (await sleep(20), ++n);
  const [a, b] = await Promise.all([swr("k", 1000, load), swr("k", 1000, load)]);
  assert.equal(a, 1);
  assert.equal(b, 1);
  assert.equal(await swr("k", 1000, load), 1);
  assert.equal(n, 1);
});

test("stale value is served at once while one refresh runs", async () => {
  invalidatePublicCache();
  let n = 0;
  const load = async () => (await sleep(10), ++n);
  await swr("s", 5, load);
  await sleep(15);
  assert.equal(await swr("s", 5, load), 1); // stale, refresh started
  await sleep(30);
  assert.equal(await swr("s", 5, load), 2);
});

test("errors and non-200 responses are not cached; invalidate clears", async () => {
  invalidatePublicCache();
  await assert.rejects(swr("e", 1000, async () => { throw new Error("db"); }));
  assert.equal(await swr("e", 1000, async () => 7), 7);
  const r = await cachedJson("j", 1000, async () => new Response("no", { status: 404 }));
  assert.equal(r.status, 404);
  const ok = await cachedJson("j", 1000, async () => Response.json({ a: 1 }));
  assert.deepEqual(await ok.json(), { a: 1 });
  invalidatePublicCache();
  assert.equal(await swr("e", 1000, async () => 8), 8);
});

test("query keys ignore order and currency", () => {
  assert.equal(queryKey("c", new URLSearchParams("b=2&a=1&currency=TRY")), queryKey("c", new URLSearchParams("a=1&b=2")));
});

test("public lists cached, admin lists not; writes invalidate", () => {
  const camps = read("app/api/campaigns/route.ts");
  assert.match(camps, /if \(parseIncludeInactive\(request\.nextUrl\.searchParams\)\) return listCampaigns\(request\);/);
  assert.match(camps, /export async function POST\(request: NextRequest\) \{\n  invalidatePublicCache\(\);/);
  assert.match(read("app/api/categories/route.ts"), /includeInactive'\) === 'true'\) return listCategories\(request\)/);
  for (const f of ["app/api/campaigns/[id]/route.ts", "app/api/categories/[id]/route.ts", "app/api/campaigns/reorder/route.ts", "app/api/categories/reorder/route.ts", "app/api/posts/route.ts", "app/api/slides/route.ts"]) {
    assert.match(read(f), /invalidatePublicCache\(\);/, f);
  }
  // Nothing in the cache module touches the database.
  assert.doesNotMatch(read("lib/server/swr-cache.ts"), /prisma/);
});
