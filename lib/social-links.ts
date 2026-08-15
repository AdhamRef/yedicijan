import type { SupportedLocale } from "@/lib/locales";

export interface SocialLinks {
  instagram: string;
  facebook: string;
  youtube: string;
  twitter: string;
}

const YOUTUBE = "https://youtube.com/@gozbebekleri134";
const TWITTER = "https://twitter.com/gozbebeklerider";

const PER_LANGUAGE: Record<"ar" | "en" | "tr", { instagram: string; facebook: string }> = {
  ar: {
    instagram: "https://www.instagram.com/gbyd_foundation/",
    facebook: "https://www.facebook.com/gozbebeklerider",
  },
  tr: {
    instagram: "https://www.instagram.com/gbyd_dernegi",
    facebook: "https://www.facebook.com/Gozbebekleridernegi",
  },
  en: {
    instagram: "https://www.instagram.com/gbyd.en",
    facebook: "https://www.facebook.com/gozbebekleri.org.en",
  },
};

/** Locales without their own page (fr, id, pt, es) fall back to English. */
export function getSocialLinks(locale: SupportedLocale | string | undefined): SocialLinks {
  const key = locale === "ar" || locale === "tr" ? locale : "en";
  const { instagram, facebook } = PER_LANGUAGE[key];
  return { instagram, facebook, youtube: YOUTUBE, twitter: TWITTER };
}
