import type { SupportedLocale } from "@/lib/locales";

export interface SocialLinks {
  instagram: string;
  facebook: string;
  twitter: string;
  /** No official channel supplied yet — callers must skip empty entries. */
  youtube: string;
}

// Yedicihan Uluslararası Yardımlaşma Derneği runs one account per network for
// every language, so there is no per-locale variation to resolve any more.
const LINKS: SocialLinks = {
  instagram: "https://www.instagram.com/yedicihan61/",
  facebook: "https://www.facebook.com/yedicihan",
  twitter: "https://twitter.com/yedicihann",
  youtube: "",
};

export function getSocialLinks(_locale?: SupportedLocale | string): SocialLinks {
  return LINKS;
}
