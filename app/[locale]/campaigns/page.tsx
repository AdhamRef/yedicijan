import type { Metadata } from "next";
import { LOCALE_SEO, buildPageMetadata } from "@/lib/seo";
import type { Locale } from "@/lib/seo";
import CampaignsPageContent from "../_components/CampaignsPageContent";
import { prisma } from "@/lib/prisma";
import {
  getInitialCampaignsForPage,
  getCategoriesForPage,
} from "@/lib/server/public-data";

interface Props {
  params: Promise<{ locale: string }>;
}

export const revalidate = 60; // cache initial HTML for 60s

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const seo = LOCALE_SEO[locale as Locale] ?? LOCALE_SEO.en;
  return buildPageMetadata(locale, {
    title: seo.campaigns.title,
    description: seo.campaigns.description,
    path: "/campaigns",
    keywords: seo.keywords,
  });
}

/** First active homepage slider image — the /campaigns hero reuses it as its backdrop. */
async function getHeroImage(): Promise<string | null> {
  try {
    const slide = await prisma.slide.findFirst({
      where: { isActive: true, image: { not: null } },
      orderBy: { order: "asc" },
      select: { image: true },
    });
    return slide?.image || null;
  } catch {
    return null;
  }
}

export default async function CampaignsPage({ params }: Props) {
  const { locale } = await params;
  const [initial, categories, heroImage] = await Promise.all([
    getInitialCampaignsForPage(locale),
    getCategoriesForPage(locale),
    getHeroImage(),
  ]);
  return (
    <CampaignsPageContent
      initialCampaigns={initial.items}
      initialCursor={initial.nextCursor}
      initialHasMore={initial.hasMore}
      initialTotal={initial.total}
      initialCategories={categories}
      heroImage={heroImage}
    />
  );
}
