/** The public /api/waqf answer, kept in memory for a minute; every dashboard write clears it. */
import { listFunds, readSettings } from "./db";
import type { WaqfFundDTO, WaqfSettingsDTO } from "./config";

type Payload = { settings: WaqfSettingsDTO; funds: WaqfFundDTO[] };
let cached: { at: number; data: Payload } | null = null;
let pending: Promise<Payload> | null = null;
const TTL = 60_000;

export async function publicWaqf(): Promise<Payload> {
  if (cached && Date.now() - cached.at < TTL) return cached.data;
  if (!pending) {
    pending = Promise.all([readSettings(), listFunds({ activeOnly: true })])
      .then(([settings, funds]) => {
        const data = { settings, funds };
        cached = { at: Date.now(), data };
        return data;
      })
      .finally(() => {
        pending = null;
      });
  }
  // A stale answer is better than waiting on the database.
  if (cached) return cached.data;
  return pending;
}

export function clearWaqfCache() {
  cached = null;
}
