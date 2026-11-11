import type { Metadata } from "next";
import { LOCALE_SEO, OG_LOCALE_MAP, OG_IMAGE, SITE_URL, buildHreflang } from "@/lib/seo";
import type { Locale } from "@/lib/seo";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import CartReminder from "@/components/CartReminder";
import { CurrencyFromUrlSync } from "@/components/CurrencyFromUrlSync";
import IntlProviderClient from "./IntlProviderClient";
import ar from "../../i18n/messages/ar.json";
import en from "../../i18n/messages/en.json";
import fr from "../../i18n/messages/fr.json";
import tr from "../../i18n/messages/tr.json";
import id from "../../i18n/messages/id.json";
import pt from "../../i18n/messages/pt.json";
import es from "../../i18n/messages/es.json";
import de from "../../i18n/messages/de.json";
import { SUPPORTED_LOCALES } from "@/lib/locales";
import { buildNormalizedMessages } from "../../i18n/message-quality";
import { Toaster } from "react-hot-toast";
import SessionProvider from "@/components/providers/SessionProvider";
import { ConfettiProvider } from "../../components/providers/confetti-provider";
import Footer from "@/components/Footer";
import PreferredLangSync from "@/components/PreferredLangSync";
import SyncHtmlDir from "@/components/SyncHtmlDir";
import { MarketingRuntime } from "@/components/MarketingRuntime";
import { CurrencyProvider } from "@/context/CurrencyContext";

// NOTE: this map must stay static (bundled JSON imports). When promoting a future
// locale from `lib/locales.ts` to public, add its `import` above + an entry here.
const rawLocaleMessages: Record<string, Record<string, unknown>> = { ar, en, fr, tr, id, pt, es, de };
const localeMessages = buildNormalizedMessages(rawLocaleMessages, "en") as Record<string, Record<string, unknown>>;
// Valid public locales derive from the single source of truth (enabled set).
const VALID_LOCALES = SUPPORTED_LOCALES;
const DEFAULT_LOCALE = "ar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = (VALID_LOCALES.includes(rawLocale as (typeof VALID_LOCALES)[number]) ? rawLocale : DEFAULT_LOCALE) as Locale;
  const seo = LOCALE_SEO[locale];
  const alternates = buildHreflang("/", locale);

  return {
    title: { default: seo.title, template: seo.titleTemplate },
    description: seo.description,
    keywords: seo.keywords,
    icons: { icon: "/yedicijan_logo.png" },
    alternates,
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${SITE_URL}/${locale}`,
      siteName: seo.siteName,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: seo.siteName }],
      locale: OG_LOCALE_MAP[locale],
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
  const locale = VALID_LOCALES.includes(rawLocale as (typeof VALID_LOCALES)[number])
    ? rawLocale
    : DEFAULT_LOCALE;
  const messages = localeMessages[locale] ?? localeMessages[DEFAULT_LOCALE];
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <IntlProviderClient locale={locale || "ar"} messages={messages}>
      <SyncHtmlDir locale={locale} />
      <MarketingRuntime>
        <div dir={dir} lang={locale === "ar" ? "ar" : locale === "fr" ? "fr" : locale === "tr" ? "tr" : locale === "id" ? "id" : locale === "pt" ? "pt" : locale === "es" ? "es" : locale === "de" ? "de" : "en"}>
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
              <Footer />
              <CartReminder />
              <ConfettiProvider />
              <Toaster position="top-center" />
            </SessionProvider>
          </CurrencyProvider>
        </div>
      </MarketingRuntime>
    </IntlProviderClient>
  );
}
