/**
 * Dashboard text helpers. Yedicihan's dashboard is Arabic only, so these return
 * the Arabic text as written. They keep the same signatures as Minber al-Aqsa's
 * dashboard i18n module so ported code needs no rewriting, without adding any
 * dashboard language.
 */

/** Returns `text`, with `{0}`, `{1}`… filled from `params`. */
export function dt(text: string, params?: readonly unknown[]): string {
  if (!params) return text;
  return text.replace(/\{(\d+)\}/g, (_, i: string) => String(params[Number(i)] ?? ""));
}

/** The `Intl` locale for a formatter written as `"ar-EG"`: always unchanged here. */
export function dashIntl(arabicLocale: string): string {
  return arabicLocale;
}
