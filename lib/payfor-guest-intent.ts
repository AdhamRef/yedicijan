import { createHmac, timingSafeEqual } from "node:crypto";

// A short-lived, bearer capability tied to the exact newly-created checkout
// record. Never accept a raw donationId as proof of a guest's ownership.
export type PayForGuestDonation = {
  id: string;
  donorId: string;
  createdAt: Date;
  totalAmount: number;
  currency: string;
};
const TTL_SECONDS = 20 * 60;

function secret(): string | null {
  const value = process.env.PAYFOR_GUEST_INTENT_SECRET || process.env.NEXTAUTH_SECRET || "";
  // Do not silently use predictable defaults or publicly exposed env variables.
  return value.length >= 32 ? value : null;
}
function signature(payload: string, key: string): Buffer {
  return createHmac("sha256", key).update("yedicihan-payfor-guest-v1.").update(payload).digest();
}
export function issueGuestPayForIntent(d: PayForGuestDonation, now = Date.now()): string | null {
  const key = secret();
  if (!key) return null;
  const payload = Buffer.from(JSON.stringify({
    id: d.id,
    donor: d.donorId,
    created: new Date(d.createdAt).getTime(),
    amount: d.totalAmount,
    currency: d.currency,
    expires: Math.floor(now / 1000) + TTL_SECONDS,
  }), "utf8").toString("base64url");
  return "v1." + payload + "." + signature(payload, key).toString("base64url");
}
export function verifyGuestPayForIntent(
  token: unknown, d: PayForGuestDonation, now = Date.now()
): boolean {
  const key = secret();
  if (!key || typeof token !== "string" || token.length > 1200) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1" ||
      !/^[A-Za-z0-9_-]+$/.test(parts[1]) ||
      !/^[A-Za-z0-9_-]+$/.test(parts[2])) return false;
  try {
    const incoming = Buffer.from(parts[2], "base64url");
    const expected = signature(parts[1], key);
    if (incoming.length !== expected.length || !timingSafeEqual(incoming, expected)) return false;
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return claims?.id === d.id &&
      claims?.donor === d.donorId &&
      claims?.created === new Date(d.createdAt).getTime() &&
      claims?.amount === d.totalAmount &&
      claims?.currency === d.currency &&
      Number.isSafeInteger(claims?.expires) &&
      claims.expires >= Math.floor(now / 1000) &&
      claims.expires <= Math.floor(now / 1000) + TTL_SECONDS;
  } catch {
    return false;
  }
}

/** Legacy PAID without paidAt means checkout created, not settled. */
export function mayStartPayForAttempt(d: {
  status: string;
  paidAt?: Date | null;
  provider?: string | null;
  providerOrderId?: string | null;
  providerRaw?: unknown;
  subscriptionId?: string | null;
}): boolean {
  return !d.paidAt && d.status !== "FAILED" && !d.subscriptionId &&
    !d.provider && !d.providerOrderId && d.providerRaw == null;
}

export function mayInitiateForActor(
  d: PayForGuestDonation,
  sessionUserId: string | null | undefined,
  guestIntent: unknown,
  now = Date.now()
): boolean {
  return sessionUserId
    ? sessionUserId === d.donorId
    : verifyGuestPayForIntent(guestIntent, d, now);
}
