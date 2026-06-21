"use client";

import { useEffect } from "react";

const LANG_MAP: Record<string, string> = {
  ar: "ar", en: "en", fr: "fr", tr: "tr", id: "id", pt: "pt", es: "es",
};

/**
 * Syncs <html> dir and lang to the active locale.
 * Root layout cannot read [locale], so we set document.documentElement after mount.
 */
export default function SyncHtmlDir({ locale }: { locale: string }) {
  useEffect(() => {
    const html = document.documentElement;
    const dir = locale === "ar" ? "rtl" : "ltr";
    html.setAttribute("dir", dir);
    html.setAttribute("lang", LANG_MAP[locale] ?? "en");
  }, [locale]);
  return null;
}
