/**
 * In-process stale-while-revalidate cache for public, read-only data.
 *
 * The database is a remote MongoDB Atlas cluster: every query costs a round trip of roughly a
 * quarter of a second from the server, and a list endpoint makes several. Public lists (projects,
 * categories, ticker) are the same for every visitor, so they are kept here for a short time:
 *  - fresher than `ttlMs`: served from memory;
 *  - older, but within `maxStaleMs`: served from memory at once while one refresh runs behind;
 *  - otherwise: loaded, with concurrent callers sharing the one load.
 * Admin writes call `invalidatePublicCache()`, so changes show on the next request.
 * Nothing here writes to the database.
 */
type Entry = { value: unknown; at: number; pending?: Promise<unknown> };

const store = new Map<string, Entry>();
const MAX_ENTRIES = 500;

function save(key: string, value: unknown) {
  store.delete(key);
  store.set(key, { value, at: Date.now() });
  while (store.size > MAX_ENTRIES) store.delete(store.keys().next().value as string);
}

export async function swr<T>(key: string, ttlMs: number, load: () => Promise<T>, maxStaleMs = 10 * 60_000): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.at > 0 && now - hit.at < ttlMs) return hit.value as T;
  if (hit && hit.at > 0 && now - hit.at < maxStaleMs) {
    if (!hit.pending) {
      hit.pending = load()
        .then((v) => (save(key, v), v))
        .catch(() => {
          hit.pending = undefined;
          return hit.value;
        });
    }
    return hit.value as T;
  }
  if (hit?.pending) return hit.pending as Promise<T>;
  const pending = load().then(
    (v) => (save(key, v), v),
    (err) => {
      store.delete(key);
      throw err;
    },
  );
  store.set(key, { value: undefined, at: 0, pending });
  return pending;
}

/** Drop every cached public list (call after an admin change to projects, categories or posts). */
export function invalidatePublicCache() {
  store.clear();
}

/** A stable key from a URL's query, whatever the parameter order. */
export function queryKey(prefix: string, params: URLSearchParams) {
  return `${prefix}?${[...params.entries()].filter(([k]) => k !== "_" && k !== "currency").sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("&")}`;
}

/**
 * Wraps a JSON GET handler: 200 responses are cached under `key`, anything else passes through
 * uncached.
 */
export async function cachedJson(key: string, ttlMs: number, handler: () => Promise<Response>): Promise<Response> {
  let passthrough: Response | null = null;
  try {
    const data = await swr(key, ttlMs, async () => {
      const res = await handler();
      if (res.status !== 200) {
        passthrough = res;
        throw new Error("uncached");
      }
      return res.json();
    });
    return Response.json(data);
  } catch (err) {
    if (passthrough) return passthrough;
    // Another request's load returned a non-200 while this one waited on it: answer directly.
    if (err instanceof Error && err.message === "uncached") return handler();
    throw err;
  }
}
