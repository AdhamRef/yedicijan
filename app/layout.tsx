import type { Metadata } from "next";
import { Suspense } from "react";
import { Poppins, Noto_Kufi_Arabic } from "next/font/google";
import DeferredGTM from "@/components/DeferredGTM";
import MicrosoftClarity from "@/components/MicrosoftClarity";
import EngagementInstrumentation from "@/components/EngagementInstrumentation";
import { Analytics } from "@vercel/analytics/next";
import "./[locale]/globals.css";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

const notoKufiArabic = Noto_Kufi_Arabic({
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.gozbebekleri.org";
const OG_IMAGE = `/circle-logo.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),

  title: {
    default: "جمعية قرة العيون للإغاثة والتكافل | زكاة، تبرع، صدقة، إغاثة إنسانية",
    template: "%s | جمعية قرة العيون للإغاثة والتكافل",
  },

  description:
    "Gözbebekleri – قرة العيون: منصة تبرعات خيرية موثوقة منذ 2011 لإنقاذ أرواح الأطفال والمرضى السوريين. تبرع لعمليات طبية عاجلة، زكاة المال، صدقة جارية، كفالة يتيم، وإغاثة إنسانية. Donate for urgent Syrian medical aid, orphan sponsorship, zakat & sadaqah. Trusted since 2011.",

  keywords: [
    "تبرع سوريا", "مساعدة طبية سوريا", "جمعية خيرية", "تبرع عملية طبية",
    "إغاثة إنسانية", "زكاة المال", "صدقة جارية", "تكفل يتيم", "تبرع طارئ",
    "قرة العيون", "مساعدة السوريين", "عمليات قلب سوريا", "أطفال سوريا",
    "تبرع اونلاين", "كفالة يتيم", "تبرع رمضان", "جمعية إسلامية خيرية",
    "مشاريع إنسانية", "تبرع طبي عاجل", "إغاثة الأطفال", "حملات تبرع",
    "زكاة الفطر", "زكاة المال اونلاين", "أفضل جمعية خيرية", "أين أضع زكاتي",
    "تبرع للأيتام", "تبرع لعملية قلب", "مساعدة المرضى السوريين", "إغاثة سوريا",
    "صدقة على الأطفال", "كفالة طفل يتيم", "تبرع إسلامي موثوق",
    "donate to Syria", "Syrian medical aid", "charity donation", "urgent surgery donation",
    "humanitarian relief Syria", "zakat donation online", "sadaqah online", "orphan sponsorship",
    "emergency medical aid Syria", "nonprofit Syria", "Syrian refugees help",
    "heart surgery donation", "Gozbebekleri charity", "Muslim charity",
    "Islamic charity donation", "donate for children Syria", "Syria relief organization",
    "donate zakat online", "sponsor Syrian child", "Ramadan donation",
    "best Islamic charity", "where to donate zakat", "most trusted charity for Syria",
    "donate for heart surgery", "children medical fund Syria", "Syria humanitarian crisis",
    "help Syrian orphans", "online sadaqah jariyah", "zakat calculator Syria",
    "donate for Syrian children", "Islamic relief donation",
    "Suriye bağış", "Gözbebekleri derneği", "zekat bağışı", "yetim sponsorluğu",
    "Suriye tıbbi yardım", "acil ameliyat bağışı", "insani yardım Suriye",
    "sadaka online", "Suriye çocukları yardım", "hayır derneği bağış",
    "online zekat ver", "Suriye yetim sponsoru", "en güvenilir hayır derneği",
    "Ramazan bağışı", "kalp ameliyatı bağışı Suriye",
    "don Syrie", "aide médicale Syrie", "zakat en ligne", "parrainage orphelin",
    "aide humanitaire Syrie", "association caritative musulmane",
    "faire un don pour la Syrie", "charité islamique", "sadaqa en ligne",
    "donasi Suriah", "bantuan medis Suriah", "zakat online", "sponsori yatim",
    "amal islami terpercaya", "donasi operasi jantung", "sedekah online",
    "doação Síria", "ajuda médica Síria", "zakat online", "caridade islâmica",
    "patrocínio de órfão Síria", "doação humanitária",
    "donación Siria", "ayuda médica Siria", "zakat online", "caridad islámica",
    "patrocinio huérfano Siria", "donación humanitaria",
  ],

  authors: [{ name: "Gözbebekleri Derneği", url: SITE }],
  creator: "Gözbebekleri",
  publisher: "Gözbebekleri",

  // Browser tab + the icon Google shows beside a search result. Declared here
  // as well as in the locale and dashboard layouts so routes that sit under
  // neither of those still get an icon instead of falling back to nothing —
  // there is no `favicon.ico` or `app/icon.*` file in this project.
  icons: { icon: "/logometa.avif" },

  alternates: {
    canonical: `${SITE}/ar`,
    languages: {
      ar: `${SITE}/ar`,
      en: `${SITE}/en`,
      fr: `${SITE}/fr`,
      tr: `${SITE}/tr`,
      id: `${SITE}/id`,
      pt: `${SITE}/pt`,
      es: `${SITE}/es`,
      de: `${SITE}/de`,
      "x-default": `${SITE}/ar`,
    },
  },

  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Gözbebekleri | قرة العيون",
    title: "جمعية قرة العيون للإغاثة والتكافل | زكاة، تبرع، صدقة، إغاثة إنسانية",
    description:
      "منصة تبرعات خيرية موثوقة منذ 2011 — تبرع لعمليات طبية عاجلة وكفالة أيتام وإغاثة إنسانية في سوريا. Trusted Islamic charity for Syrian medical aid, zakat & sadaqah since 2011.",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Gözbebekleri – قرة العيون Charity" }],
    locale: "ar_SA",
    alternateLocale: ["en_US", "fr_FR", "tr_TR", "id_ID", "pt_BR", "es_ES", "de_DE"],
  },

  twitter: {
    card: "summary_large_image",
    site: "@gozbebeklerider",
    creator: "@gozbebeklerider",
    title: "Gözbebekleri | قرة العيون – تبرع لإنقاذ الأرواح",
    description:
      "تبرع لعمليات طبية عاجلة وإغاثة إنسانية في سوريا — زكاة، صدقة، كفالة يتيم. Donate for Syrian medical aid & humanitarian relief.",
    images: [OG_IMAGE],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  category: "charity",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": ["Organization", "NGO"],
  "@id": `${SITE}/#organization`,
  name: "Gözbebekleri",
  alternateName: ["قرة العيون", "Gozbebekleri Derneği", "قرة العيون للإغاثة والتكافل"],
  url: SITE,
  logo: {
    "@type": "ImageObject",
    url: "circle-logo.png",
    width: 374,
    height: 206,
  },
  image: OG_IMAGE,
  description:
    "Gözbebekleri – قرة العيون is a trusted humanitarian charity providing urgent medical aid, orphan sponsorship, and humanitarian relief for Syrian children and families since 2011.",
  foundingDate: "2011",
  areaServed: ["Syria", "Turkey", "Global"],
  knowsLanguage: ["ar", "en", "fr", "tr", "id", "pt", "es", "de"],
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+90-212-288-59-30",
      contactType: "customer service",
      availableLanguage: ["Arabic", "Turkish", "English"],
    },
  ],
  sameAs: [
    "https://www.facebook.com/gozbebeklerider/",
    "https://www.instagram.com/gbyd_foundation/",
    "https://www.youtube.com/channel/UCvvSx8jtGafK9BI2hQnBYSQ",
    "https://x.com/gozbebeklerider",
    "https://wa.me/905380308212",
  ],
  address: {
    "@type": "PostalAddress",
    addressCountry: "TR",
  },
  nonprofitStatus: "Nonprofit501c3",
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE}/#website`,
  url: SITE,
  name: "Gözbebekleri | قرة العيون",
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

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "كيف يمكنني التبرع لجمعية قرة العيون؟",
      acceptedAnswer: {
        "@type": "Answer",
        text: "يمكنك التبرع مباشرة عبر موقعنا الإلكتروني gozbebekleri.org باختيار الحملة المناسبة وإتمام الدفع بأمان عبر بطاقتك الائتمانية أو خدمات الدفع الإلكتروني. جميع التبرعات موثقة وتصل مباشرة للمستفيدين.",
      },
    },
    {
      "@type": "Question",
      name: "هل يمكنني دفع زكاتي عبر منصة قرة العيون؟",
      acceptedAnswer: {
        "@type": "Answer",
        text: "نعم، نقبل زكاة المال وزكاة الفطر. يتم توزيع الزكاة على المستحقين من الأسر السورية المحتاجة وفق الشروط الشرعية المعتمدة. يمكنك تخصيص تبرعك للزكاة عند إتمام عملية الدفع.",
      },
    },
    {
      "@type": "Question",
      name: "How does orphan sponsorship work with Gözbebekleri?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our orphan sponsorship program provides monthly financial support covering education, healthcare, and basic needs for Syrian orphaned children. You can sponsor a child for as little as $30/month. You receive regular updates and reports about the child you sponsor.",
      },
    },
    {
      "@type": "Question",
      name: "Is Gözbebekleri a trustworthy and legitimate charity?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Gözbebekleri (قرة العيون) has been operating since 2011, registered in Turkey, and has helped over 40,000 families across Syria and the region. We publish transparent financial reports and every donation is tracked. We have a verified presence on Facebook, Instagram, and YouTube.",
      },
    },
    {
      "@type": "Question",
      name: "Gözbebekleri derneğine nasıl bağış yapabilirim?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "gozbebekleri.org adresinden dilediğiniz projeyi seçerek güvenli ödeme altyapımız üzerinden kredi kartı veya diğer ödeme yöntemleriyle bağışınızı yapabilirsiniz. Tüm bağışlar belgelenmiş olup doğrudan ihtiyaç sahiplerine ulaştırılmaktadır.",
      },
    },
    {
      "@type": "Question",
      name: "ما هي مشاريع الجمعية الإنسانية الأكثر إلحاحاً؟",
      acceptedAnswer: {
        "@type": "Answer",
        text: "تشمل أبرز مشاريعنا: العمليات الجراحية العاجلة لأطفال القلب، كفالة الأيتام، توزيع السلال الغذائية، دعم التعليم للأطفال المهجرين، والإغاثة الطارئة في مناطق النزاع السوري. يمكنك الاطلاع على جميع الحملات النشطة في صفحة المشاريع.",
      },
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${SITE}/ar` },
    { "@type": "ListItem", position: 2, name: "الحملات", item: `${SITE}/ar/campaigns` },
    { "@type": "ListItem", position: 3, name: "المدونة", item: `${SITE}/ar/blog` },
    { "@type": "ListItem", position: 4, name: "من نحن", item: `${SITE}/ar/about-us` },
    { "@type": "ListItem", position: 5, name: "تواصل معنا", item: `${SITE}/ar/contact-us` },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="geo.region" content="SY" />
        <meta name="geo.placename" content="Syria" />
        <meta name="classification" content="charity, humanitarian, nonprofit" />
        <meta name="rating" content="general" />
        <meta name="revisit-after" content="3 days" />
        <meta name="language" content="Arabic" />

        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://i.ibb.co" />
        <link rel="preload" href="/bg.webp" as="image" type="image/webp" />

        <script src="https://t.contentsquare.net/uxa/e81365186c19c.js" async />
      </head>
      <body
        className={`${poppins.variable} ${notoKufiArabic.variable} font-arabic antialiased`}
      >
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-MMNBQQWB"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
        {children}
        <MicrosoftClarity />
        <Suspense fallback={null}>
          <EngagementInstrumentation />
        </Suspense>
        <DeferredGTM />
        <Analytics />
      </body>
    </html>
  );
}
