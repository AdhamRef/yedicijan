import { buildManagedPageMetadata } from "@/lib/content-editor/page-seo";
import type { Metadata } from "next";
import { LOCALE_SEO } from "@/lib/seo";
import type { Locale } from "@/lib/seo";
import AboutPageContent from "../_components/AboutPageContent";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const seo = LOCALE_SEO[locale as Locale] ?? LOCALE_SEO.en;
  return buildManagedPageMetadata("about", locale, {
    title: seo.about.title,
    description: seo.about.description,
    path: "/about-us",
    keywords: seo.keywords,
  });
}

export default function AboutPage() {
  return <AboutPageContent />;
}
