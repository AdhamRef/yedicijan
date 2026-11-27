import type { Metadata } from "next";
import { LOCALE_SEO, buildPageMetadata } from "@/lib/seo";
import type { Locale } from "@/lib/seo";
import CampaignsPageContent from "../_components/CampaignsPageContent";
import { prisma } from "@/lib/prisma";
import { swr } from "@/lib/server/swr-cache";
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
function getHeroImage(): Promise<string | null> {
  return swr("page:campaignsHeroSlide", 300_000, loadHeroImage);
}

async function loadHeroImage(): Promise<string | null> {
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
  // A field photo from the projects themselves (not one of the first cards, which sit right
  // below); the homepage slide only when no project has a photo.
  const withPhoto = (initial.items as { images?: string[] }[]).filter((c) => c.images?.[0]);
  const fieldPhoto = (withPhoto[3] ?? withPhoto[withPhoto.length - 1])?.images?.[0] ?? null;
  return (
    <CampaignsPageContent
      initialCampaigns={initial.items}
      initialCursor={initial.nextCursor}
      initialHasMore={initial.hasMore}
      initialTotal={initial.total}
      initialCategories={categories}
      heroImage={fieldPhoto ?? heroImage}
    />
  );
}
