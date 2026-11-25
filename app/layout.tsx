import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import MicrosoftClarity from "@/components/MicrosoftClarity";
import EngagementInstrumentation from "@/components/EngagementInstrumentation";
import { Analytics } from "@vercel/analytics/next";
import { LOCALES, LOCALE_SEO, OG_IMAGE, OG_LOCALE_MAP, SITE_NAME, SITE_URL, buildHreflang, isProductionDeployment, isVercelDeployment } from "@/lib/seo";
import { isValidLocale, localeDirection } from "@/lib/locales";
import { InboxPermissionsBoundary } from "@/components/dashboard/InboxPermissionsBoundary";
import "./[locale]/globals.css";
import "@/styles/self-hosted-fonts.css";

/**
 * Site type: Tajawal for Arabic (`font-arabic`) and Poppins for Latin, as in the
 * Yedicihan design. Cairo, Montserrat and Amiri stay declared for the dashboard
 * and Qur'anic text.
 *
 * The files are self-hosted (`public/fonts/`, declared in
 * `styles/self-hosted-fonts.css`, refreshed by `scripts/vendor-google-fonts.mjs`)
 * rather than loaded through `next/font/google`: that helper downloads every
 * face at build time, and one failed download under Turbopack fails the whole
 * production build. The variables below are the same CSS variables the
 * `next/font` objects used to set, so Tailwind's `font-*` families are unchanged.
 */
const SITE_FONT_VARIABLES: React.CSSProperties = {
  ["--font-cairo" as string]: "'Cairo'",
  ["--font-montserrat" as string]: "'Montserrat'",
  ["--font-amiri" as string]: "'Amiri'",
  ["--font-poppins" as string]: "'Poppins'",
  ["--font-arabic" as string]: "'Tajawal'",
};

const SITE = SITE_URL;

/**
 * The root layout carries no per-page SEO of its own: title, description,
 * OpenGraph, Twitter card and hreflang all derive from `LOCALE_SEO` /
 * `SUPPORTED_LOCALES` (`lib/seo.ts`), the same source every locale page uses,
 * and the values here are only the fallback for routes outside `[locale]`.
 * The association's Organization and WebSite nodes are emitted once, below.
 * FAQPage and BreadcrumbList are not: FAQPage belongs only where the questions
 * are actually rendered, and BreadcrumbList only on inner pages with a real trail.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE),

  /* The fallback for routes outside `[locale]` (the dashboard, error pages).
     Locale pages override all of this from the same generated source. */
  title: LOCALE_SEO.ar.title,
  description: LOCALE_SEO.ar.description,

  authors: [{ name: SITE_NAME, url: SITE }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  applicationName: SITE_NAME,

  /* `app/favicon.ico` is the icon now  a real file, which is also what stops a
     browser's automatic `/favicon.ico` request from falling through to the
     `[locale]` segment. `icons` is left unset so Next uses it. */

  /* Every public locale, from the same helper every page uses. */
  alternates: buildHreflang("/", "ar"),

  openGraph: {
    type: "website",
    url: SITE,
    siteName: LOCALE_SEO.ar.siteName,
    title: LOCALE_SEO.ar.title,
    description: LOCALE_SEO.ar.description,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: LOCALE_SEO.ar.siteName }],
    locale: OG_LOCALE_MAP.ar,
    alternateLocale: LOCALES.filter((l) => l !== "ar").map((l) => OG_LOCALE_MAP[l]),
  },

  twitter: {
    card: "summary_large_image",
    title: LOCALE_SEO.ar.title,
    description: LOCALE_SEO.ar.description,
    images: [OG_IMAGE],
  },

  /* Indexable on production only. A preview deployment carries production
     canonicals, which does not by itself stop its own URL being indexed 
     so it says noindex here, in `app/robots.ts`, and in the X-Robots-Tag
     header from `next.config.ts` (`DEPLOYED_VS_DESIGN_AUDIT.md` § P1.1). */
  robots: isProductionDeployment()
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
          "max-video-preview": -1,
        },
      }
    : { index: false, follow: false, googleBot: { index: false, follow: false } },

  category: "charity",
};


const organizationSchema = {
  "@context": "https://schema.org",
  "@type": ["Organization", "NGO"],
  "@id": `${SITE}/#organization`,
  name: "Yedicihan",
  alternateName: ["يدي جيهان", "Yedicihan Derneği", "يدي جيهان"],
  url: SITE,
  logo: {
    "@type": "ImageObject",
    url: "/yedicijan_logo.png",
    width: 374,
    height: 206,
  },
  image: OG_IMAGE,
  description:
    "Yedicihan International Solidarity Association is a Turkish public-benefit association founded in 1961, working in healthcare, emergency relief, disaster response and educational aid.",
  foundingDate: "1961-11-09",
  areaServed: ["Turkey", "Global"],
  knowsLanguage: ["ar", "en", "fr", "tr", "id", "pt", "es", "de"],
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+90-530-651-65-49",
      email: "info@yedicihan.org",
      contactType: "customer service",
      availableLanguage: ["Turkish", "Arabic", "English"],
    },
  ],
  email: "info@yedicihan.org",
  telephone: "+90-530-651-65-49",
  sameAs: [
    "https://www.facebook.com/yedicihan",
    "https://www.instagram.com/yedicihan61/",
    "https://twitter.com/yedicihann",
    "https://wa.me/905306516549",
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "Bağlar, Mimar Sinan Cd. No:38",
    addressLocality: "Bağcılar",
    addressRegion: "İstanbul",
    postalCode: "34209",
    addressCountry: "TR",
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE}/#website`,
  url: SITE,
  name: "Yedicihan | يدي جيهان",
  description:
    "Donate for Syrian medical aid, zakat, sadaqah, and orphan sponsorship. تبرع لعمليات طبية عاجلة وإغاثة إنسانية في سوريا.",
  inLanguage: ["ar", "en", "fr", "tr", "id", "pt", "es", "de"],
  publisher: { "@id": `${SITE}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE}/ar/campaigns?search={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // proxy.ts writes NEXT_LOCALE onto the request before SSR. Reading it here
  // makes the very first HTML document carry the right language/direction for
  // crawlers and assistive technology; SyncHtmlDir still handles client-side
  // navigation between locale prefixes without a full document reload.
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get("NEXT_LOCALE")?.value ?? "ar";
  const htmlLocale = isValidLocale(rawLocale) ? rawLocale : "ar";
  const htmlDir = localeDirection(htmlLocale);

  return (
    <html lang={htmlLocale} dir={htmlDir} suppressHydrationWarning>
      <head>
        <meta name="geo.region" content="TR-34" />
        <meta name="geo.placename" content="İstanbul" />
        <meta name="classification" content="charity, humanitarian, nonprofit" />
        <meta name="rating" content="general" />

        {/* dns-prefetch, not preconnect: Cloudinary images sit below the fold, and an
            unused early connection is flagged by PageSpeed. */}
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://i.ibb.co" />
        {/* No global image preload: `/bg.webp` was preloaded on every page for a
            legacy homepage that is no longer rendered, competing with each
            page's real LCP image for bandwidth. */}

        <script src="https://t.contentsquare.net/uxa/e81365186c19c.js" async />
      </head>
      <body className="font-arabic antialiased" style={SITE_FONT_VARIABLES}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <InboxPermissionsBoundary>{children}</InboxPermissionsBoundary>
        <Suspense fallback={null}>
          <MicrosoftClarity />
        </Suspense>
        <Suspense fallback={null}>
          <EngagementInstrumentation />
        </Suspense>
        {/* Vercel-only: on the VPS `/_vercel/insights/script.js` is a 404 and a console error. */}
        {isVercelDeployment() ? <Analytics /> : null}
      </body>
    </html>
  );
}
