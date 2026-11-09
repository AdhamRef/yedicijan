import { readEmergencyMaintenance } from "@/lib/site-security/emergency-maintenance";
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import {
  ALLOWED_URL_CURRENCIES,
  normalizeCurrencyParamToCookie,
} from '@/lib/currency-link';
import { currencyForCountry } from '@/lib/geo/country-to-currency';
import { localeForCountry } from '@/lib/geo/country-to-locale';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/lib/locales';

// Single source of truth (enabled/public locales) — see `lib/locales.ts`.
const LOCALES = SUPPORTED_LOCALES;
const LOCALE_IN_PATH_RE = new RegExp(`^/(${SUPPORTED_LOCALES.join('|')})(/|$)`);

const intl = createIntlMiddleware({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
});

const CURRENCY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** ISO country code from edge-injected headers (Vercel / Cloudflare). */
function countryFromHeaders(req: NextRequest): string | null {
  const vercel = req.headers.get('x-vercel-ip-country')?.trim().toUpperCase();
  if (vercel && /^[A-Z]{2}$/.test(vercel) && vercel !== 'XX') return vercel;
  const cf = req.headers.get('cf-ipcountry')?.trim().toUpperCase();
  if (cf && /^[A-Z]{2}$/.test(cf) && cf !== 'XX') return cf;
  return null;
}

function safeDecode(pathname: string): string {
  try {
    return decodeURI(pathname).normalize('NFC');
  } catch {
    return pathname;
  }
}

// Runs before SSR so the page renders with `currency` already in cookies —
// otherwise scripts/pixels would fire with the default (USD) before the
// client-side `?currency=` sync catches up.
export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const recoverable = /^\/(?:dashboard|auth)(?:\/|$)/.test(path)
    || /^\/api\/(?:admin|auth|cron|webhooks)(?:\/|$)/.test(path)
    || /^\/api\/(?:stripe\/webhook|paypal\/return|payfor\/3dpay\/(?:ok|fail)|albaraka\/3d\/callback|telegram\/webhook)(?:\/|$)/.test(path);
  if (!recoverable) {
    try {
      if ((await readEmergencyMaintenance()).enabled) {
        if (path.startsWith("/api/")) return NextResponse.json(
          { error: "SITE_UNDER_MAINTENANCE" },
          { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "300" } },
        );
        return new NextResponse(
          '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>صيانة أمنية</title><body style="font-family:system-ui;max-width:42rem;margin:16vh auto;padding:2rem;text-align:center"><h1>الموقع يخضع لصيانة أمنية مؤقتة</h1><p>نعتذر عن توقف خدمة التبرع مؤقتًا لحماية المعاملات.</p><p lang="en" dir="ltr">Temporary security maintenance. Please return later.</p></body></html>',
          { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "300" } },
        );
      }
    } catch { /* Readers fail open to preserve callback and administrative recovery. */ }
  }
  if (path.startsWith("/api/") || /^\/(?:dashboard|auth)(?:\/|$)/.test(path)) return NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // Locale-less URL (e.g. a share link generated with auto-locale): pick a
  // locale from the visitor's country and redirect. URLs that already include
  // a locale prefix are left alone so explicit choices are never overridden.
  if (!LOCALE_IN_PATH_RE.test(pathname)) {
    const country = countryFromHeaders(req);
    const locale = localeForCountry(country) ?? DEFAULT_LOCALE;
    const url = req.nextUrl.clone();
    url.pathname = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;
    // The redirect target re-enters this middleware and picks up the currency
    // cookie there, so we don't need to set it on the 307 response.
    return NextResponse.redirect(url);
  }

  const currencyParam = req.nextUrl.searchParams.get('currency');
  let normalized: string | null = null;
  if (currencyParam) {
    const upper = currencyParam.toUpperCase();
    if (ALLOWED_URL_CURRENCIES.has(upper)) {
      normalized = normalizeCurrencyParamToCookie(upper);
      // Update the request cookies so anything that reads cookies() during SSR
      // (e.g. server-side currency helpers) sees the new value immediately.
      req.cookies.set('currency', normalized);
    }
  }

  // First-visit geo detection: when there's no `?currency=` and no existing
  // cookie, pick a currency based on the visitor's country from edge headers.
  // Never overrides an explicit choice (cookie already set or URL param given).
  if (!normalized && !req.cookies.get('currency')) {
    const country = countryFromHeaders(req);
    const geoCurrency = currencyForCountry(country);
    if (geoCurrency) {
      normalized = geoCurrency;
      req.cookies.set('currency', normalized);
    }
  }

  const response = intl(req) ?? NextResponse.next();

  // next-intl answers an already-prefixed path with a rewrite to that same path,
  // built on `req.url`. Behind the nginx proxy that absolute URL can come out on a
  // different origin than the one Next compares it against (e.g. https vs http),
  // and Next then treats it as an external rewrite and proxies the request to
  // `https://localhost:3000` — which speaks plain HTTP, so it fails with EPROTO.
  // A rewrite that doesn't change the path does nothing, so pass the request
  // through instead. The locale request headers next-intl set are kept.
  // Paths are compared decoded: next-intl decodes the pathname and re-encodes it
  // when building the rewrite, so a non-ASCII slug (every Arabic campaign URL) can
  // come back with different percent-encoding than the request carried.
  const rewrite = response.headers.get('x-middleware-rewrite');
  if (rewrite) {
    const target = new URL(rewrite);
    if (
      safeDecode(target.pathname) === safeDecode(req.nextUrl.pathname) &&
      target.search === req.nextUrl.search
    ) {
      response.headers.delete('x-middleware-rewrite');
      response.headers.set('x-middleware-next', '1');
    }
  }

  if (normalized) {
    response.cookies.set('currency', normalized, {
      maxAge: CURRENCY_COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  // Catch every public path so locale-less share links also reach the middleware
  // and can be redirected. Excludes: API/Next internals/Vercel internals,
  // the standalone dashboard + auth routes (not localized), and any file with
  // an extension (favicon, images, sitemap.xml, etc.).
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
