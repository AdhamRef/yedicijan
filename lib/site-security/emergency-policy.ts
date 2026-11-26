import { isSecurityExemptPath } from "./policy";
import { MAINTENANCE_TEXTS } from "./emergency-texts";
/**
 * Emergency switch, two levels:
 *  DONATIONS — the site stays fully browsable; only STARTING a payment is refused, with a short
 *              notice in the donor's language. Payments already started (bank callbacks, failure
 *              recording) still complete, so nothing at the bank is lost.
 *  SITE      — the whole public site closes (maintenance page); the dashboard, login, cron,
 *              webhooks, every bank callback and the success page stay open.
 */
export type EmergencyMode = "OFF" | "DONATIONS" | "SITE";
export const isEmergencyMode = (v: unknown): v is EmergencyMode => v === "OFF" || v === "DONATIONS" || v === "SITE";

/** The requests that START a payment on this site (cart checkout, direct donation, and the two gateways' initiate calls). */
const PAYMENT_START = /^\/api\/(?:cart\/payment|donations|albaraka\/3d\/initiate|payfor\/3dpay\/initiate)\/?$/;
export function isPaymentStartRequest(method: string, path: string): boolean {
  return method.toUpperCase() === "POST" && PAYMENT_START.test(path);
}

export function isEmergencyAllowedPath(path: string): boolean {
  return (
    isSecurityExemptPath(path) ||
    /^\/api\/dashboard(?:\/|$)/.test(path) ||
    /^\/[a-z]{2}\/success\/[a-f\d]{24}(?:\/|$)/i.test(path)
  );
}

export { pauseTexts, requestLocale } from "./emergency-texts";

export const EMERGENCY_PAGE = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>صيانة مؤقتة · Yedicihan</title><body style="font-family:system-ui,-apple-system,Segoe UI,Tahoma,sans-serif;max-width:40rem;margin:12vh auto;padding:2rem;line-height:1.7;color:#1f2937">${MAINTENANCE_TEXTS.map((t, i) =>
  (t.title ? `<h1 style="color:#8b1d1d">${t.title}</h1>` : "") + `<p lang="${t.lang}" dir="${t.dir}">${t.body}</p>` + (i === 0 ? `<hr style="margin:2rem 0;border:0;border-top:1px solid #e5e7eb">` : "")).join("")}</body></html>`;
