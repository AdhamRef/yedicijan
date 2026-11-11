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
  return /(?:^|\\/)(?:dashboard|auth|account|login|register|profile|checkout|payment|donation-failed|donation-pending|success)(?:\\/|$)/i.test(path);
}

export function canRunOptionalTracking(path: string): boolean {
  return readTrackingConsent() === "granted" && !trackingSensitivePath(path);
}

export function saveTrackingConsent(value: Exclude<TrackingConsent, null>): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = TRACKING_CONSENT_COOKIE + "=" + value + "; Max-Age=15552000; Path=/; SameSite=Lax" + secure;
  window.dispatchEvent(new Event(TRACKING_CONSENT_EVENT));
}
