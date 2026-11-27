import type { Metadata } from "next";
import { LOCALE_SEO, buildPageMetadata } from "@/lib/seo";
import type { Locale } from "@/lib/seo";
import { getMetalPrices } from "@/lib/zakat/metal-prices";
import ZakatPageContent from "./_components/ZakatPageContent";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  // Same JSON the client uses; read directly so metadata needs no next-intl server config.
  const messages = (await import(`@/i18n/messages/${locale}.json`).catch(() => import("@/i18n/messages/ar.json"))).default as Record<string, Record<string, string>>;
  const t = (k: string) => messages["Zakat"]?.[k] ?? "";
  const seo = LOCALE_SEO[locale as Locale] ?? LOCALE_SEO.en;
  return buildPageMetadata(locale, { title: t("metaTitle"), description: t("metaDescription"), path: "/zakat", keywords: seo.keywords });
}

// Metal prices are cached for six hours inside getMetalPrices.
export const revalidate = 21600;

export default async function ZakatPage() {
  const prices = await getMetalPrices();
  return <ZakatPageContent prices={prices} />;
}
