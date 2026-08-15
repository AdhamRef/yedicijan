import type { Metadata } from "next";
import { LOCALE_SEO, buildPageMetadata } from "@/lib/seo";
import type { Locale } from "@/lib/seo";
import TermsPage from "./TermsPage";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const seo = LOCALE_SEO[locale as Locale] ?? LOCALE_SEO.en;
  const titles: Record<string, string> = {
    ar: "شروط الاستخدام",
    en: "Terms of Use",
    fr: "Conditions d'Utilisation",
    tr: "Kullanım Şartları",
    id: "Syarat Penggunaan",
    pt: "Termos de Uso",
    es: "Términos de Uso",
  };
  return buildPageMetadata(locale, {
    title: titles[locale] ?? titles.en,
    description: seo.description,
    path: "/terms",
    keywords: seo.keywords,
  });
}

export default async function TermsRoute({ params }: Props) {
  const { locale } = await params;
  return <TermsPage locale={locale} />;
}
