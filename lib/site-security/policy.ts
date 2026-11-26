import { isIP } from "node:net";

/*
 * Client-IP helpers taken from Minber al-Aqsa's site-security policy (only the
 * part the donation guard needs; the IP/country block rules are not ported).
 */
export function canonicalNetwork(raw: string): string | null {
  const parts = raw.trim().split("/");
  if (parts.length > 2) return null;
  let address = parts[0].replace(/^::ffff:(?=\d+\.)/i, "");
  const family = isIP(address);
  if (address.includes("%") || !family) return null;
  if (family === 6)
    address = new URL(`http://[${address}]/`).hostname.slice(1, -1);
  if (parts.length === 1) return address;
  if (!/^\d+$/.test(parts[1])) return null;
  const prefix = Number(parts[1]);
  if (prefix < 0 || prefix > (family === 4 ? 32 : 128)) return null;
  return address + "/" + prefix;
}
export function securityClientIp(headers: Pick<Headers, "get">): string | null {
  // The VPS nginx overwrites X-Real-IP. Never prioritize a caller-supplied CF header.
  const real = canonicalNetwork(headers.get("x-real-ip") || "");
  if (real && isIP(real)) return real;
  if (process.env.VERCEL) {
    const forwarded = canonicalNetwork(
      headers.get("x-vercel-forwarded-for")?.split(",").at(-1)?.trim() || "",
    );
    if (forwarded && isIP(forwarded)) return forwarded;
  }
  return null;
}

/**
 * Paths an emergency closure must never block: the dashboard and sign-in, admin,
 * cron and webhook APIs, and the bank callbacks that finish a payment already
 * started (Yedicihan's gateways: Albaraka and PayFor).
 */
export function isSecurityExemptPath(path: string) {
  return (
    /^\/(?:[a-z]{2}\/)?(?:dashboard|auth)(?:\/|$)/.test(path) ||
    /^\/api\/(?:admin|auth|webhooks|cron)(?:\/|$)/.test(path) ||
    /^\/api\/(?:albaraka\/3d\/callback|payfor\/3dpay\/(?:ok|fail)|telegram\/webhook)(?:\/|$)/.test(path)
  );
}
