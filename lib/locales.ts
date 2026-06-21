/**
 * Supported locales across the app (i18n routes, API, dashboard CRUD, messages).
 * Add new locales here and in i18n/routing + middleware + message files.
 */
export const SUPPORTED_LOCALES = [
  "ar",
  "en",
  "fr",
  "tr",
  "id",
  "pt",
  "es",
  "de",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  ar: "العربية",
  en: "English",
  fr: "Français",
  tr: "Türkçe",
  id: "Indonesia",
  pt: "Português",
  es: "Español",
  de: "Deutsch",
};

/** Locales for dropdown/select (code + label). */
export const LOCALE_OPTIONS = SUPPORTED_LOCALES.map((code) => ({
  code,
  label: LOCALE_LABELS[code],
}));

export function isValidLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export const DEFAULT_LOCALE: SupportedLocale = "ar";
