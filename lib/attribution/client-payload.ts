"use client";

import { DONATION_ATTRIBUTION_KEYS, type DonationAttributionKey } from "./sanitize";
import { captureStoredClickIds } from "@/lib/tracking/click-id-storage";

const PREFIX = "ala_attr_";
const MAX_AGE_DAYS = 30;
const SESSION_KEY = "ala_tracking_session_id";
const FBCLID_SESSION_KEY = "ala_fbclid";

function setCookie(name: string, value: string) {
  const expires = new Date(Date.now() + MAX_AGE_DAYS * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax; Secure`;
}

function setRawCookie(name: string, value: string, overwrite = true) {
  if (!overwrite && getRawCookie(name)) return;
  const expires = new Date(Date.now() + MAX_AGE_DAYS * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax; Secure`;
}

function getCookie(name: string): string | undefined {
  const hit = document.cookie.split("; ").find((row) => row.startsWith(`${encodeURIComponent(name)}=`));
  if (!hit) return undefined;
  try { return decodeURIComponent(hit.split("=").slice(1).join("=")); } catch { return undefined; }
}

function getRawCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const hit = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  if (!hit) return undefined;
  try { return decodeURIComponent(hit.split("=").slice(1).join("=")); } catch { return undefined; }
}

/**
 * Every GA4 web-stream session cookie (_ga_<suffix>) as "SUFFIX:session" pairs.
 * Kept inline (no import) so sandboxed fixtures load this module unchanged.
 * The server keeps only the stream matching its Measurement ID. Never fabricated,
 * never stored in an attribution cookie; skipped on explicit denial, GPC or DNT.
 */
function currentGa4SessionStreams(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { globalPrivacyControl?: boolean }) : undefined;
  if (nav?.globalPrivacyControl === true || nav?.doNotTrack === "1" || nav?.doNotTrack === "yes") return undefined;
  const cookies = document.cookie || "";
  if (/(?:^|;\s*)(?:analytics_consent|tracking_consent)=(?:denied|rejected|false|0)(?:;|$)/i.test(cookies)) return undefined;
  const streams = new Map<string, string>();
  for (const part of cookies.split(";")) {
    const trimmed = part.trim(), separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const name = /^_ga_([A-Za-z0-9]{1,24})$/.exec(trimmed.slice(0, separator));
    if (!name) continue;
    let value = trimmed.slice(separator + 1);
    try { value = decodeURIComponent(value); } catch { continue; }
    const session = /^GS1\.\d+\.(\d{10})\./.exec(value) || /^GS2\.\d+\.s(\d{10})(?:\$|$)/.exec(value);
    if (!session) continue;
    const suffix = name[1].toUpperCase();
    if (streams.has(suffix) && streams.get(suffix) !== session[1]) streams.set(suffix, "");
    else streams.set(suffix, session[1]);
  }
  const pairs = [...streams].filter(([, session]) => session).slice(0, 8).map(([suffix, session]) => `${suffix}:${session}`);
  return pairs.length ? pairs.join(",") : undefined;
}

function getOrCreateSessionId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch { return undefined; }
}

function sessionGet(key: string): string | undefined {
  try { return sessionStorage.getItem(key) || undefined; } catch { return undefined; }
}

function sessionSet(key: string, value: string) {
  try { sessionStorage.setItem(key, value); } catch {}
}

function hasMacro(value: string): boolean {
  return value.includes("{{") || value.includes("}}") || value.includes("__CAMPAIGN_") || value.includes("__ADGROUP_") || value.includes("__AD_");
}

function setIfClean(key: DonationAttributionKey, value: string | null | undefined, overwrite = true) {
  const v = value?.trim();
  if (!v) return;
  if (hasMacro(v)) {
    setCookie(PREFIX + `${key}_unresolved`, "true");
    return;
  }
  if (!overwrite && getCookie(PREFIX + key)) return;
  setCookie(PREFIX + key, v.slice(0, 2048));
}

function getOrCreateFbp(): string | undefined {
  const existing = getRawCookie("_fbp");
  if (existing) return existing;
  const generated = `fb.1.${Date.now()}.${Math.floor(Math.random() * 1e10)}`;
  setRawCookie("_fbp", generated, false);
  return generated;
}

function buildFbc(fbclid: string): string {
  return `fb.1.${Date.now()}.${fbclid}`;
}

function persistMetaClickIds(params: URLSearchParams) {
  const fromUrl = params.get("fbclid");
  const storedFbclid = sessionGet(FBCLID_SESSION_KEY) || getCookie(PREFIX + "fbclid");
  const fbclid = fromUrl && !hasMacro(fromUrl) ? fromUrl : storedFbclid;

  if (fbclid && !hasMacro(fbclid)) {
    sessionSet(FBCLID_SESSION_KEY, fbclid);
    setIfClean("fbclid", fbclid, false);
    const fbc = getRawCookie("_fbc") || getCookie(PREFIX + "fbc") || buildFbc(fbclid);
    setRawCookie("_fbc", fbc, false);
    setIfClean("fbc", fbc, false);
  }

  const fbp = getOrCreateFbp();
  if (fbp) setIfClean("fbp", fbp, false);
}

/** Capture URL params + click IDs into cookies (call once on app load / route change). */
export function captureAttributionFromUrl(): void {
  if (typeof window === "undefined") return;
  const storedClickIds = captureStoredClickIds();
  const params = new URLSearchParams(window.location.search);
  const keys: DonationAttributionKey[] = [...DONATION_ATTRIBUTION_KEYS];
  for (const key of keys) {
    const fromUrl = params.get(key) || storedClickIds[key as keyof typeof storedClickIds];
    if (fromUrl) setIfClean(key, fromUrl, true);
  }

  const currentUrl = window.location.href.split("#")[0].slice(0, 2048);
  setIfClean("first_landing_page", currentUrl, false);
  setIfClean("landing_page", currentUrl, true);
  if (document.referrer) {
    setIfClean("first_referrer", document.referrer.slice(0, 2048), false);
    setIfClean("referrer", document.referrer.slice(0, 2048), true);
  }

  const sessionId = getOrCreateSessionId();
  if (sessionId) setIfClean("session_id", sessionId, false);

  persistMetaClickIds(params);

  const ga = getRawCookie("_ga");
  if (ga) {
    setIfClean("_ga", ga, false);
    const m = ga.match(/^GA\d\.\d\.(.+)$/);
    if (m) setIfClean("ga_client_id", m[1], false);
  }
}

/**
 * Build the attribution payload persisted onto the donation row at create time.
 * It merges stored UTM/click cookies, real browser IDs, current conversion URL,
 * and a stable session id. Values with unresolved ad macros are omitted and
 * flagged by the server sanitizer so they do not poison reporting.
 */
export function getDonationAttributionPayload(): Record<string, string> {
  if (typeof document === "undefined") return {};
  captureAttributionFromUrl();
  const out: Record<string, string> = {};
  for (const key of DONATION_ATTRIBUTION_KEYS) {
    const v = getCookie(PREFIX + key);
    if (v) out[key] = v;
  }

  const currentUrl = window.location.href.split("#")[0].slice(0, 2048);
  out.conversion_page = currentUrl;
  out.landing_page = out.landing_page || currentUrl;
  out.first_landing_page = out.first_landing_page || out.landing_page;
  if (document.referrer) out.referrer = out.referrer || document.referrer.slice(0, 2048);

  const sessionId = getOrCreateSessionId();
  if (sessionId) out.session_id = out.session_id || sessionId;

  if (!out.fbclid) {
    const fbclid = sessionGet(FBCLID_SESSION_KEY);
    if (fbclid) out.fbclid = fbclid;
  }
  if (!out.fbp) {
    const fbp = getRawCookie("_fbp") || getOrCreateFbp();
    if (fbp) out.fbp = fbp;
  }
  if (!out.fbc) {
    const fbc = getRawCookie("_fbc") || (out.fbclid ? buildFbc(out.fbclid) : undefined);
    if (fbc) {
      out.fbc = fbc;
      setRawCookie("_fbc", fbc, false);
      setIfClean("fbc", fbc, false);
    }
  }
  if (!out.ga_client_id) {
    const ga = getRawCookie("_ga");
    if (ga) {
      out._ga = out._ga || ga;
      const m = ga.match(/^GA\d\.\d\.(.+)$/);
      if (m) out.ga_client_id = m[1];
    }
  }

  const gaStreams = currentGa4SessionStreams();
  if (gaStreams) {
    out.ga_session_streams = gaStreams;
    const pairs = gaStreams.split(",");
    if (pairs.length === 1) out.ga_session_id = pairs[0].split(":")[1];
    else delete out.ga_session_id;
  } else {
    delete out.ga_session_streams;
    delete out.ga_session_id;
  }

  return out;
}
