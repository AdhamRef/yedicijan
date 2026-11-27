import type { Metadata } from "next";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/locales";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.yedicihan.org").replace(/\/$/, "");
export const SITE_NAME = "Yedicihan";
export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

// Locales derive from the single source of truth (`lib/locales.ts`). The
// per-locale maps below are `Record<Locale, …>`, so enabling a new public locale
// becomes a compile error here until its SEO/OG content is filled in — that is the
// intended drift guard for translated content.
export const LOCALES = SUPPORTED_LOCALES;
export type Locale = SupportedLocale;

export const OG_LOCALE_MAP: Record<Locale, string> = {
  ar: "ar_SA",
  en: "en_US",
  fr: "fr_FR",
  tr: "tr_TR",
  id: "id_ID",
  pt: "pt_BR",
  es: "es_ES",
  de: "de_DE",
};

type LocaleSEO = {
  siteName: string;
  title: string;
  description: string;
  keywords: string[];
  titleTemplate: string;
  campaigns: { title: string; description: string };
  about: { title: string; description: string };
  contact: { title: string; description: string };
  blog: { title: string; description: string };
};

export const LOCALE_SEO: Record<Locale, LocaleSEO> = {
  ar: {
    siteName: "الهيئة الدولية للإغاثة الإنسانية",
    title: "الهيئة الدولية للإغاثة الإنسانية | زكاة، تبرع، صدقة جارية، إغاثة",
    description: "الهيئة الدولية للإغاثة الإنسانية (Yedi Cihan) مؤسسة خيرية رائدة منذ 1961، حاصلة على صفة النفع العام من الحكومة التركية. ادفع زكاتك وصدقتك الجارية لمشاريع الإغاثة العاجلة وسقيا الماء وبناء المساجد والمأوى والتعليم في 23 دولة.",
    keywords: [
      "الهيئة الدولية للإغاثة الإنسانية", "يدي جيهان", "زكاة المال اونلاين", "صدقة جارية",
      "حفر بئر", "بناء مسجد", "إغاثة غزة", "إغاثة السودان", "مشاريع إغاثة سوريا",
      "مشاريع اليمن", "مشاريع إفريقيا", "تبرع رمضان", "أضاحي", "زكاة الفطر",
      "وقف خيري", "أسهم وقفية", "مؤسسة خيرية تركية", "مؤسسة ذات نفع عام", "تبرع اونلاين", "منصة تبرع موثوقة",
    ],
    titleTemplate: "%s",
    campaigns: {
      title: "مشاريع التبرع | الهيئة الدولية للإغاثة الإنسانية",
      description: "تصفح مشاريع الإغاثة والتنمية المفتوحة: آبار مياه، مساجد، مأوى، تعليم، وإغاثة عاجلة في غزة والسودان وسوريا واليمن وإفريقيا. زكاتك وصدقتك تصل وتوثَّق بالصور.",
    },
    about: {
      title: "من نحن | الهيئة الدولية للإغاثة الإنسانية",
      description: "الهيئة الدولية للإغاثة الإنسانية (Yedi Cihan) مؤسسة خيرية تأسست عام 1961، حاصلة على صفة النفع العام من الحكومة التركية، تنفّذ مشاريع إغاثية وتنموية مستدامة في 23 دولة.",
    },
    contact: {
      title: "تواصل معنا | الهيئة الدولية للإغاثة الإنسانية",
      description: "هل لديك سؤال أو تريد التبرع؟ تواصل مع فريق الهيئة الدولية للإغاثة الإنسانية — نرد على استفساراتك في أقرب وقت.",
    },
    blog: {
      title: "أخبار وتقارير ميدانية | الهيئة الدولية للإغاثة الإنسانية",
      description: "آخر الأخبار والتقارير الميدانية من مشاريع الهيئة الدولية للإغاثة الإنسانية في غزة والسودان وسوريا واليمن وإفريقيا والبلقان.",
    },
  },


  en: {
    siteName: "Yedicihan",
    title: "Yedicihan | Zakat, Donations & Humanitarian Relief Since 1961",
    description: "Yedicihan International Solidarity Association: a Turkish public-benefit charity since 1961. Give your zakat, sadaqah and waqf to emergency relief, water wells, mosques, shelter and education in Gaza, Sudan, Syria, Yemen and Africa — 23 countries, every project documented from the field.",
    keywords: [
      "Yedicihan",
      "zakat online",
      "pay zakat",
      "donate to Gaza",
      "Sudan relief",
      "Syria relief",
      "Yemen aid",
      "water well donation",
      "build a mosque",
      "waqf shares",
      "sadaqah jariyah",
      "Islamic charity Turkey",
      "humanitarian aid",
      "emergency relief",
      "orphan support",
      "winter aid",
      "Ramadan donation",
      "qurbani",
      "trusted charity since 1961",
    ],
    titleTemplate: "%s",
    campaigns: {
      title: "Donation Projects | Yedicihan",
      description: "Browse open relief and development projects: water wells, mosques, shelter, education and emergency aid in Gaza, Sudan, Syria, Yemen and Africa. Give in a minute with secure 3D payment.",
    },
    about: {
      title: "About Us | Yedicihan — Humanitarian Work Since 1961",
      description: "Yedicihan is a Turkish public-benefit association founded in 1961, working in emergency relief, water, mosques, shelter, education and family support across 23 countries.",
    },
    contact: {
      title: "Contact Us | Yedicihan",
      description: "Questions about a project, your zakat or a donation? Reach the Yedicihan team by WhatsApp, phone or email — we reply as soon as we can.",
    },
    blog: {
      title: "News & Field Reports | Yedicihan",
      description: "Latest news and field reports from Yedicihan projects in Gaza, Sudan, Syria, Yemen and Africa.",
    },
  },

  fr: {
    siteName: "Yedicihan",
    title: "Yedicihan | Zakat, dons et aide humanitaire depuis 1961",
    description: "Yedicihan, association de solidarité internationale reconnue d’utilité publique en Turquie depuis 1961. Versez votre zakat, sadaqa et waqf pour l’aide d’urgence, les puits, les mosquées, l’abri et l’éducation à Gaza, au Soudan, en Syrie, au Yémen et en Afrique — 23 pays.",
    keywords: [
      "Yedicihan",
      "zakat en ligne",
      "payer la zakat",
      "don Gaza",
      "aide Soudan",
      "aide Syrie",
      "aide Yémen",
      "don puits",
      "construire une mosquée",
      "waqf",
      "sadaqa jariya",
      "association islamique",
      "aide humanitaire",
      "aide d’urgence",
      "orphelins",
      "don Ramadan",
    ],
    titleTemplate: "%s",
    campaigns: {
      title: "Projets de dons | Yedicihan",
      description: "Découvrez les projets ouverts : puits, mosquées, abris, éducation et aide d’urgence à Gaza, au Soudan, en Syrie, au Yémen et en Afrique. Paiement sécurisé 3D en une minute.",
    },
    about: {
      title: "Qui sommes-nous | Yedicihan — au service des plus démunis depuis 1961",
      description: "Yedicihan est une association turque d’utilité publique fondée en 1961 : aide d’urgence, eau, mosquées, abris, éducation et soutien aux familles dans 23 pays.",
    },
    contact: {
      title: "Contact | Yedicihan",
      description: "Une question sur un projet, votre zakat ou un don ? Contactez l’équipe Yedicihan par WhatsApp, téléphone ou e-mail.",
    },
    blog: {
      title: "Actualités et rapports de terrain | Yedicihan",
      description: "Dernières actualités et rapports de terrain des projets Yedicihan à Gaza, au Soudan, en Syrie, au Yémen et en Afrique.",
    },
  },

  tr: {
    siteName: "Yedicihan Derneği",
    title: "Yedicihan Derneği | Zekât, Bağış ve İnsani Yardım – 1961'den Beri",
    description: "Yedicihan Uluslararası Yardımlaşma Derneği: 1961'den beri kamu yararına çalışan bir dernek. Zekâtınızı, sadakanızı ve vakıf bağışınızı Gazze, Sudan, Suriye, Yemen ve Afrika'daki acil yardım, su kuyusu, cami, barınma ve eğitim projelerine ulaştırıyoruz — 23 ülke, sahadan belgelenen her proje.",
    keywords: [
      "Yedicihan Derneği",
      "online zekât",
      "zekât ver",
      "Gazze bağış",
      "Sudan yardım",
      "Suriye yardım",
      "Yemen yardım",
      "su kuyusu bağışı",
      "cami yaptırma",
      "vakıf hissesi",
      "sadaka-i cariye",
      "kamu yararına dernek",
      "insani yardım",
      "acil yardım",
      "yetim desteği",
      "kışlık yardım",
      "Ramazan bağışı",
      "kurban bağışı",
    ],
    titleTemplate: "%s",
    campaigns: {
      title: "Bağış Projeleri | Yedicihan Derneği",
      description: "Açık yardım ve kalkınma projelerine göz atın: su kuyuları, camiler, barınma, eğitim ve Gazze, Sudan, Suriye, Yemen ve Afrika'da acil yardım. 3D güvenli ödemeyle bir dakikada bağış yapın.",
    },
    about: {
      title: "Hakkımızda | Yedicihan Derneği — 1961'den Beri İnsani Yardım",
      description: "Yedicihan, 1961'de kurulan kamu yararına bir derneğidir; 23 ülkede acil yardım, su, cami, barınma, eğitim ve aile desteği alanlarında çalışır.",
    },
    contact: {
      title: "İletişim | Yedicihan Derneği",
      description: "Bir proje, zekâtınız ya da bağışınız hakkında sorunuz mu var? Yedicihan ekibine WhatsApp, telefon veya e-postayla ulaşın.",
    },
    blog: {
      title: "Haberler ve Saha Raporları | Yedicihan Derneği",
      description: "Yedicihan'ın Gazze, Sudan, Suriye, Yemen ve Afrika'daki projelerinden son haberler ve saha raporları.",
    },
  },

  id: {
    siteName: "Yedicihan",
    title: "Yedicihan | Zakat, Donasi & Bantuan Kemanusiaan sejak 1961",
    description: "Yedicihan, asosiasi solidaritas internasional berstatus manfaat publik di Turki sejak 1961. Salurkan zakat, sedekah, dan wakaf Anda untuk bantuan darurat, sumur air, masjid, hunian, dan pendidikan di Gaza, Sudan, Suriah, Yaman, dan Afrika — 23 negara.",
    keywords: [
      "Yedicihan",
      "zakat online",
      "bayar zakat",
      "donasi Gaza",
      "bantuan Sudan",
      "bantuan Suriah",
      "bantuan Yaman",
      "wakaf sumur",
      "bangun masjid",
      "saham wakaf",
      "sedekah jariyah",
      "lembaga amal Turki",
      "bantuan kemanusiaan",
      "bantuan darurat",
      "santunan yatim",
      "donasi Ramadan",
      "kurban",
    ],
    titleTemplate: "%s",
    campaigns: {
      title: "Proyek Donasi | Yedicihan",
      description: "Jelajahi proyek bantuan dan pembangunan: sumur air, masjid, hunian, pendidikan, dan bantuan darurat di Gaza, Sudan, Suriah, Yaman, dan Afrika. Donasi dalam semenit dengan pembayaran aman 3D.",
    },
    about: {
      title: "Tentang Kami | Yedicihan — Berkhidmat sejak 1961",
      description: "Yedicihan adalah asosiasi berstatus manfaat publik di Turki yang berdiri sejak 1961, bergerak di bantuan darurat, air bersih, masjid, hunian, pendidikan, dan dukungan keluarga di 23 negara.",
    },
    contact: {
      title: "Hubungi Kami | Yedicihan",
      description: "Ada pertanyaan tentang proyek, zakat, atau donasi? Hubungi tim Yedicihan lewat WhatsApp, telepon, atau email.",
    },
    blog: {
      title: "Berita & Laporan Lapangan | Yedicihan",
      description: "Berita terbaru dan laporan lapangan dari proyek Yedicihan di Gaza, Sudan, Suriah, Yaman, dan Afrika.",
    },
  },

  pt: {
    siteName: "Yedicihan",
    title: "Yedicihan | Zakat, doações e ajuda humanitária desde 1961",
    description: "Yedicihan, associação de solidariedade internacional de utilidade pública na Turquia desde 1961. Entregue o seu zakat, sadaqa e waqf para ajuda de emergência, poços de água, mesquitas, abrigo e educação em Gaza, no Sudão, na Síria, no Iémen e em África — 23 países.",
    keywords: [
      "Yedicihan",
      "zakat online",
      "pagar zakat",
      "doar para Gaza",
      "ajuda Sudão",
      "ajuda Síria",
      "ajuda Iémen",
      "doação poço de água",
      "construir mesquita",
      "waqf",
      "sadaqa jariya",
      "instituição islâmica",
      "ajuda humanitária",
      "ajuda de emergência",
      "órfãos",
      "doação Ramadão",
    ],
    titleTemplate: "%s",
    campaigns: {
      title: "Projetos de doação | Yedicihan",
      description: "Conheça os projetos abertos: poços, mesquitas, abrigos, educação e ajuda de emergência em Gaza, no Sudão, na Síria, no Iémen e em África. Doe num minuto com pagamento seguro 3D.",
    },
    about: {
      title: "Quem somos | Yedicihan — ao serviço desde 1961",
      description: "A Yedicihan é uma associação turca de utilidade pública fundada em 1961: ajuda de emergência, água, mesquitas, abrigo, educação e apoio às famílias em 23 países.",
    },
    contact: {
      title: "Contacto | Yedicihan",
      description: "Tem uma pergunta sobre um projeto, o seu zakat ou uma doação? Fale com a equipa Yedicihan por WhatsApp, telefone ou e-mail.",
    },
    blog: {
      title: "Notícias e relatórios de terreno | Yedicihan",
      description: "Últimas notícias e relatórios de terreno dos projetos Yedicihan em Gaza, no Sudão, na Síria, no Iémen e em África.",
    },
  },

  es: {
    siteName: "Yedicihan",
    title: "Yedicihan | Zakat, donaciones y ayuda humanitaria desde 1961",
    description: "Yedicihan, asociación de solidaridad internacional de utilidad pública en Turquía desde 1961. Entrega tu zakat, sadaqa y waqf para ayuda de emergencia, pozos de agua, mezquitas, refugio y educación en Gaza, Sudán, Siria, Yemen y África — 23 países.",
    keywords: [
      "Yedicihan",
      "zakat online",
      "pagar zakat",
      "donar a Gaza",
      "ayuda Sudán",
      "ayuda Siria",
      "ayuda Yemen",
      "donar pozo de agua",
      "construir mezquita",
      "waqf",
      "sadaqa jariya",
      "organización islámica",
      "ayuda humanitaria",
      "ayuda de emergencia",
      "huérfanos",
      "donación Ramadán",
    ],
    titleTemplate: "%s",
    campaigns: {
      title: "Proyectos de donación | Yedicihan",
      description: "Descubre los proyectos abiertos: pozos, mezquitas, refugios, educación y ayuda de emergencia en Gaza, Sudán, Siria, Yemen y África. Dona en un minuto con pago seguro 3D.",
    },
    about: {
      title: "Quiénes somos | Yedicihan — al servicio desde 1961",
      description: "Yedicihan es una asociación turca de utilidad pública fundada en 1961: ayuda de emergencia, agua, mezquitas, refugio, educación y apoyo a familias en 23 países.",
    },
    contact: {
      title: "Contacto | Yedicihan",
      description: "¿Tienes una pregunta sobre un proyecto, tu zakat o una donación? Escribe al equipo de Yedicihan por WhatsApp, teléfono o correo.",
    },
    blog: {
      title: "Noticias e informes de campo | Yedicihan",
      description: "Últimas noticias e informes de campo de los proyectos de Yedicihan en Gaza, Sudán, Siria, Yemen y África.",
    },
  },

  de: {
    siteName: "Yedicihan",
    title: "Yedicihan | Zakat, Spenden & humanitäre Hilfe seit 1961",
    description: "Yedicihan, ein in der Türkei als gemeinnützig anerkannter internationaler Hilfsverein seit 1961. Geben Sie Ihre Zakat, Sadaqa und Ihren Waqf für Nothilfe, Brunnen, Moscheen, Unterkünfte und Bildung in Gaza, im Sudan, in Syrien, im Jemen und in Afrika — 23 Länder.",
    keywords: [
      "Yedicihan",
      "Zakat online",
      "Zakat zahlen",
      "Spenden Gaza",
      "Hilfe Sudan",
      "Hilfe Syrien",
      "Hilfe Jemen",
      "Brunnen spenden",
      "Moschee bauen",
      "Waqf",
      "Sadaqa Jariya",
      "islamische Hilfsorganisation",
      "humanitäre Hilfe",
      "Nothilfe",
      "Waisen",
      "Ramadan Spende",
    ],
    titleTemplate: "%s",
    campaigns: {
      title: "Spendenprojekte | Yedicihan",
      description: "Entdecken Sie offene Projekte: Brunnen, Moscheen, Unterkünfte, Bildung und Nothilfe in Gaza, im Sudan, in Syrien, im Jemen und in Afrika. In einer Minute spenden – sicher mit 3D-Zahlung.",
    },
    about: {
      title: "Über uns | Yedicihan — im Einsatz seit 1961",
      description: "Yedicihan ist ein 1961 gegründeter gemeinnütziger Verein aus der Türkei: Nothilfe, Wasser, Moscheen, Unterkünfte, Bildung und Familienhilfe in 23 Ländern.",
    },
    contact: {
      title: "Kontakt | Yedicihan",
      description: "Fragen zu einem Projekt, Ihrer Zakat oder einer Spende? Erreichen Sie das Yedicihan-Team per WhatsApp, Telefon oder E-Mail.",
    },
    blog: {
      title: "Nachrichten & Feldberichte | Yedicihan",
      description: "Aktuelle Nachrichten und Feldberichte aus den Yedicihan-Projekten in Gaza, im Sudan, in Syrien, im Jemen und in Afrika.",
    },
  },
};

/** Build hreflang alternates for a given path (e.g. "/campaigns") */
export function buildHreflang(path: string, currentLocale: string) {
  const normalizedPath = path === "/" ? "" : path;
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = `${SITE_URL}/${locale}${normalizedPath}`;
  }
  languages["x-default"] = `${SITE_URL}/ar${normalizedPath}`;
  return {
    canonical: `${SITE_URL}/${currentLocale}${normalizedPath}`,
    languages,
  };
}

/**
 * Build hreflang/canonical alternates for a slug-routed entity (campaign, post,
 * category) where each locale may have its OWN translation slug.
 *
 * Each locale's URL uses its own per-locale slug when present, falling back to
 * the entity's base slug, then to `fallback` (typically the entity id).
 *
 * Example: an AR campaign with slug "زكاة-القدس" and an EN translation slug
 * "pay-your-zakat-at-al-quds" yields:
 *   hreflang="ar" → /ar/campaign/زكاة-القدس
 *   hreflang="en" → /en/campaign/pay-your-zakat-at-al-quds
 *
 * Without this, Google sees the same slug under every hreflang and may drop
 * the per-locale variants from the index.
 */
export function buildLocalizedAlternates(args: {
  /** URL prefix without trailing slash, e.g. "/campaign", "/blog", "/category" */
  basePath: string;
  /** Default-locale (Arabic) slug from the entity row */
  baseSlug?: string | null;
  /** Per-locale translation rows; only `locale` and optional `slug` are used */
  translations?: Array<{ locale: string; slug?: string | null }> | null;
  /** Used when neither a translation slug nor base slug is set (typically the entity id) */
  fallback: string;
  /** Locale of the page we're rendering — drives `canonical` */
  currentLocale: string;
}): { canonical: string; languages: Record<string, string> } {
  const { basePath, baseSlug, translations, fallback, currentLocale } = args;
  const slugFor = (loc: string): string => {
    const t = translations?.find((tt) => tt.locale === loc && tt.slug);
    return t?.slug || baseSlug || fallback;
  };
  const url = (loc: string): string =>
    `${SITE_URL}/${loc}${basePath}/${encodeURIComponent(slugFor(loc))}`;

  const languages: Record<string, string> = {};
  for (const locale of LOCALES) languages[locale] = url(locale);
  languages["x-default"] = url("ar");
  return { canonical: url(currentLocale), languages };
}

/** Build full per-page metadata (layout/page generateMetadata helper) */
export function buildPageMetadata(
  locale: string,
  overrides: {
    title: string;
    description: string;
    path: string;
    image?: string;
    keywords?: string[];
    type?: "website" | "article";
  }
): Metadata {
  const seo = LOCALE_SEO[locale as Locale] ?? LOCALE_SEO.en;
  const image = overrides.image ?? OG_IMAGE;
  const alternates = buildHreflang(overrides.path, locale);

  // Every page title ends with the site name exactly once, in the page's own language.
  const title = overrides.title.includes(seo.siteName) ? overrides.title : `${overrides.title} | ${seo.siteName}`;
  return {
    title: { absolute: title },
    description: overrides.description,
    keywords: overrides.keywords ?? seo.keywords,
    alternates,
    openGraph: {
      title,
      description: overrides.description,
      url: alternates.canonical,
      siteName: seo.siteName,
      locale: OG_LOCALE_MAP[locale as Locale] ?? "en_US",
      type: overrides.type ?? "website",
      images: [{ url: image, width: 1200, height: 630, alt: overrides.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: overrides.description,
      images: [image],
    },
  };
}
