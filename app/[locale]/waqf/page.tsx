import type { Metadata } from "next";
import { LOCALE_SEO, buildPageMetadata } from "@/lib/seo";
import type { Locale } from "@/lib/seo";
import WaqfPageContent from "./_components/WaqfPageContent";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  // Same JSON the client uses; read directly so metadata needs no next-intl server config.
  const messages = (await import(`@/i18n/messages/${locale}.json`).catch(() => import("@/i18n/messages/ar.json"))).default as Record<string, Record<string, string>>;
  const t = (k: string) => messages["Waqf"]?.[k] ?? "";
  const seo = LOCALE_SEO[locale as Locale] ?? LOCALE_SEO.en;
  return buildPageMetadata(locale, { title: t("metaTitle"), description: t("metaDescription"), path: "/waqf", keywords: seo.keywords });
}

export default function WaqfPage() {
  return <WaqfPageContent />;
}
