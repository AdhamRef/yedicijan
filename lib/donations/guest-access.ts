import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { userHasDashboardPermission } from "@/lib/dashboard/permissions";

/**
 * HttpOnly cookie proves possession of the specific *newly-created* checkout.
 * Never accept MongoDB IDs, referral links, user-supplied email, or URL tokens
 * as permission to read donor data. Token purpose is read/status/receipt only.
 */
const TTL_SECONDS = 24 * 60 * 60;
export const guestDonationCookieName = (id: string) => "yedi_donation_access_" + id;

type DonationIdentity = {
  id: string;
  donorId: string;
  createdAt: Date;
  totalAmount: number;
  currency: string;
};

type SessionShape = {
  user?: { id?: string | null; role?: string | null; dashboardPermissions?: string[] | null };
} | null;

function signingSecret(): string | null {
  // NEVER use NEXTAUTH_SECRET for guest capabilities: separate rotation domain.
  const key = process.env.DONATION_GUEST_ACCESS_SECRET;
  return key && Buffer.byteLength(key, "utf8") >= 32 ? key : null;
}
function verificationSecrets(now: number): string[] {
  const active = signingSecret();
  const result = active ? [active] : [];
  const previous = process.env.DONATION_GUEST_ACCESS_PREVIOUS_SECRET;
  const until = Number(process.env.DONATION_GUEST_ACCESS_PREVIOUS_VALID_UNTIL);
  // Previous key may verify already-issued tokens only inside a bounded
  // migration period; it never signs new cookies.
  if (previous && Buffer.byteLength(previous, "utf8") >= 32 &&
      Number.isSafeInteger(until) && until >= Math.floor(now / 1000) &&
      until <= Math.floor(now / 1000) + TTL_SECONDS) result.push(previous);
  return result;
}
function mac(payload: string, secret: string) {
  return createHmac("sha256", secret)
    .update("yedicihan-donation-read-v1:")
    .update(payload)
    .digest();
}
export function canIssueGuestDonationAccess(): boolean {
  return Boolean(signingSecret());
}
export function createGuestDonationAccess(d: DonationIdentity, now = Date.now()) {
  const secret = signingSecret();
  if (!secret) return null;
  const payload = Buffer.from(JSON.stringify({
    version: 1,
    scope: "donation-read",
    donation: d.id,
    owner: d.donorId,
    created: new Date(d.createdAt).getTime(),
    amount: d.totalAmount,
    currency: d.currency,
    exp: Math.floor(now / 1000) + TTL_SECONDS,
  })).toString("base64url");
  return payload + "." + mac(payload, secret).toString("base64url");
}
export function verifyGuestDonationAccess(
  token: unknown,
  donation: DonationIdentity,
  now = Date.now()
): boolean {
  const secrets = verificationSecrets(now);
  if (secrets.length === 0 || typeof token !== "string" || token.length > 2048) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts.every(p => /^[A-Za-z0-9_-]+$/.test(p))) return false;
  try {
    const payloadBytes = Buffer.from(parts[0], "base64url");
    const supplied = Buffer.from(parts[1], "base64url");
    // Reject alternate base64url encodings with unused low bits. Otherwise
    // mutating the final character may decode to the same valid HMAC bytes.
    if (payloadBytes.toString("base64url") !== parts[0] ||
        supplied.toString("base64url") !== parts[1]) return false;
    const authentic = secrets.some(secret => {
      const expected = mac(parts[0], secret);
      return supplied.length === expected.length && timingSafeEqual(supplied, expected);
    });
    if (!authentic) return false;
    const claims = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    const current = Math.floor(now / 1000);
    return claims?.version === 1 &&
      claims?.scope === "donation-read" &&
      claims?.donation === donation.id &&
      claims?.owner === donation.donorId &&
      claims?.created === new Date(donation.createdAt).getTime() &&
      claims?.amount === donation.totalAmount &&
      claims?.currency === donation.currency &&
      Number.isSafeInteger(claims?.exp) &&
      claims.exp >= current && claims.exp <= current + TTL_SECONDS;
  } catch {
    return false;
  }
}
export function attachGuestDonationAccess(
  response: NextResponse,
  donation: DonationIdentity,
  sessionUserId?: string | null,
): NextResponse {
  // Logged-in users already have an authenticated, owner-bound session.
  if (sessionUserId) return response;
  const capability = createGuestDonationAccess(donation);
  if (!capability) throw new Error("Guest checkout access secret is missing");
  response.cookies.set({
    name: guestDonationCookieName(donation.id),
    value: capability,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TTL_SECONDS,
    path: "/api",
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export function donationAccessLevel(
  request: NextRequest,
  session: SessionShape,
  donation: DonationIdentity,
): "owner" | "staff" | "guest" | null {
  if (session?.user?.id && session.user.id === donation.donorId) return "owner";
  if (session?.user && (
    userHasDashboardPermission(session.user, "revenue") ||
    userHasDashboardPermission(session.user, "donationsEdit")
  )) return "staff";
  const cookie = request.cookies.get(guestDonationCookieName(donation.id))?.value;
  return verifyGuestDonationAccess(cookie, donation) ? "guest" : null;
}
export function isDonationId(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id);
}
