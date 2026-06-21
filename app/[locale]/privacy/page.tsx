import type { Metadata } from "next";
import { LOCALE_SEO, buildPageMetadata } from "@/lib/seo";
import type { Locale } from "@/lib/seo";
import PolicyPage from "./PolicyPage";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const seo = LOCALE_SEO[locale as Locale] ?? LOCALE_SEO.en;
  const titles: Record<string, string> = {
    ar: "سياسة الخصوصية",
    en: "Privacy Policy",
    fr: "Politique de Confidentialité",
    tr: "Gizlilik Politikası",
    id: "Kebijakan Privasi",
    pt: "Política de Privacidade",
    es: "Política de Privacidad",
  };
  return buildPageMetadata(locale, {
    title: titles[locale] ?? titles.en,
    description: seo.description,
    path: "/privacy",
    keywords: seo.keywords,
  });
}

export default async function PrivacyRoute({ params }: Props) {
  const { locale } = await params;
  return <PolicyPage locale={locale} />;
}
