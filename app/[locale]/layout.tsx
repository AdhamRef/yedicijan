import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LOCALES, LOCALE_SEO, OG_LOCALE_MAP, OG_IMAGE, SITE_URL, buildHreflang, isVercelDeployment } from "@/lib/seo";
import type { Locale } from "@/lib/seo";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import CartReminder from "@/components/CartReminder";
import FieldGallery from "@/components/minbar/shell/FieldGallery";
import { CurrencyFromUrlSync } from "@/components/CurrencyFromUrlSync";
import IntlProviderClient from "./IntlProviderClient";
import { SUPPORTED_LOCALES, localeDirection } from "@/lib/locales";
import { messagesFor } from "@/i18n/locale-messages";
import { Toaster } from "react-hot-toast";
import SessionProvider from "@/components/providers/SessionProvider";
import { ConfettiProvider } from "../../components/providers/confetti-provider";
import Footer from "@/components/Footer";
import PreferredLangSync from "@/components/PreferredLangSync";
import SyncHtmlDir from "@/components/SyncHtmlDir";
import { MarketingRuntime } from "@/components/MarketingRuntime";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Valid public locales derive from the single source of truth (enabled set).
// The message catalog itself is built once in `i18n/locale-messages.ts`.
const VALID_LOCALES = SUPPORTED_LOCALES;

/**
 * A first path segment that is not a locale is NOT a page in Arabic.
 *
 * This segment used to fall back to `ar` silently, so every stray root request 
 * `/favicon.ico`, `/apple-touch-icon.png`, a mistyped path, a crawler probing
 * `/wp-admin`  rendered the Arabic homepage with `locale = "favicon.ico"`
 * threaded through it. Anything that then handed that string to `Intl` threw
 * `RangeError: Incorrect locale information provided`, which is how a missing
 * favicon became a 500 in production rather than a 404.
 *
 * A real `app/favicon.ico` now answers that particular request, but the rule is
 * the fix: an unknown locale is a 404, and `notFound()` says so.
 */
function assertLocale(rawLocale: string): Locale {
  if (!VALID_LOCALES.includes(rawLocale as (typeof VALID_LOCALES)[number])) notFound();
  return rawLocale as Locale;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  const seo = LOCALE_SEO[locale];
  const alternates = buildHreflang("/", locale);

  return {
    title: { default: seo.title, template: seo.titleTemplate },
    description: seo.description,
    keywords: seo.keywords,
    alternates,
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${SITE_URL}/${locale}`,
      siteName: seo.siteName,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: seo.siteName }],
      locale: OG_LOCALE_MAP[locale],
      alternateLocale: LOCALES.filter((candidate) => candidate !== locale).map((candidate) => OG_LOCALE_MAP[candidate]),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [OG_IMAGE],
    },
  };
}

export default async function Rootlayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = assertLocale(rawLocale);
  // The Yedicihan public pages read their copy client-side from the full
  // normalized catalog, so the whole locale bundle is provided here.
  const messages = messagesFor(locale);
  // Direction comes from the locale catalog, not a hand-written check.
  const dir = localeDirection(locale);

  return (
    <IntlProviderClient locale={locale} messages={messages}>
      <SyncHtmlDir locale={locale} />
      <MarketingRuntime>
        <div dir={dir} lang={locale}>
          <CurrencyProvider>
            <Suspense fallback={null}>
              <CurrencyFromUrlSync />
            </Suspense>
            <SessionProvider>
              <PreferredLangSync />
              <Navbar />
              <main className="pt-12 lg:pt-[88px]">
                {children}
              </main>
              <FieldGallery locale={locale} />
              <Footer />
              <CartReminder />
              <ConfettiProvider />
              <Toaster position="top-center" />
            </SessionProvider>
          </CurrencyProvider>
          {/* Analytics is mounted once, in the root layout. Both are Vercel-only:
              on the VPS their scripts 404 and log console errors. */}
          {isVercelDeployment() ? <SpeedInsights /> : null}
        </div>
      </MarketingRuntime>
    </IntlProviderClient>
  );
}
