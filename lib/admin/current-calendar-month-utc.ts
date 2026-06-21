/** Start/end of the calendar month containing `now`, in UTC (matches existing admin stats date handling). */
export function getCurrentCalendarMonthUtcRange(now: Date = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const monthStart = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  return { monthStart, monthEnd };
}

const LOCALE_MAP: Record<string, string> = {
  ar: "ar-SA",
  en: "en-US",
  fr: "fr-FR",
  es: "es-ES",
  pt: "pt-BR",
  tr: "tr-TR",
  id: "id-ID",
};

/** Localized full month name for the UTC calendar month containing `date` (aligns with thisMonthRevenue API). */
export function formatUtcCalendarMonthLong(date: Date = new Date(), locale: string) {
  const intlLocale = (LOCALE_MAP[locale] ?? locale) || "en-US";
  return new Intl.DateTimeFormat(intlLocale, { month: "long", timeZone: "UTC" }).format(date);
}
