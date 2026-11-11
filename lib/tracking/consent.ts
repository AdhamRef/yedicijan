/** Single consent authority for optional client-side analytics and advertising.
 * This is separate from verified payment, bank settlement and receipt evidence.
 */
export const TRACKING_CONSENT_COOKIE = "yedi_analytics_consent";
export const TRACKING_CONSENT_EVENT = "yedi:analytics-consent-change";
export type TrackingConsent = "granted" | "denied" | null;

export function readTrackingConsent(): TrackingConsent {
  if (typeof document === "undefined") return null;
  const value = document.cookie.split("; ").find(part => part.startsWith(TRACKING_CONSENT_COOKIE + "="))?.split("=")[1];
  return value === "granted" || value === "denied" ? value : null;
}

export function trackingSensitivePath(path: string): boolean {
  return /(?:^|\/)(?:dashboard|auth|account|login|register|profile|cart|checkout|payment|donate|donations|receipt|donation-failed|donation-pending|success)(?:\/|$)/i.test(path);
}

export function canRunOptionalTracking(path: string): boolean {
  return readTrackingConsent() === "granted" && !trackingSensitivePath(path);
}

export function saveTrackingConsent(value: Exclude<TrackingConsent, null>): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = TRACKING_CONSENT_COOKIE + "=" + value + "; Max-Age=15552000; Path=/; SameSite=Lax" + secure;
  if (value === "denied") {
    // First-party opt-out: clear our cached advertising click IDs and any
    // first-party vendor cookies we can control. Third-party cookies must
    // also be addressed through provider-level revocation and retention policy.
    try {
      if (typeof sessionStorage !== "undefined") {
        for (const key of ["_ttclid", "_gclid", "_fbclid", "_snap_click_id", "_scid", "ala_fbclid", "ala_tracking_session_id"]) {
          sessionStorage.removeItem(key);
        }
      }
      for (const entry of document.cookie.split(";")) {
        const name = entry.trim().split("=")[0];
        if (/^(_fbp|_fbc|_ga(?:_.*)?|_gid|_gcl_.*|_ttp|_tt_enable_cookie|ala_attr_(fbp|fbc|fbclid|gclid|ttclid|ga_client_id|_ga))$/.test(name)) {
          document.cookie = encodeURIComponent(name) + "=; Max-Age=0; Path=/; SameSite=Lax" + secure;
        }
      }
    } catch { /* Do not block consent withdrawal if cookie storage is restricted. */ }
  }
  window.dispatchEvent(new Event(TRACKING_CONSENT_EVENT));
}

/** Permit opaque ad click IDs only, never free-form query strings or PII. */
export function safeOpaqueClickId(value: string | undefined): string | undefined {
  if (!value || value.length > 256) return undefined;
  return /^[A-Za-z0-9._-]{4,256}$/.test(value) ? value : undefined;
}
