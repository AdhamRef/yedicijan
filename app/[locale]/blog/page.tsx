import type { Metadata } from "next";
import { LOCALE_SEO, buildPageMetadata } from "@/lib/seo";
import type { Locale } from "@/lib/seo";
import BlogPageContent from "../_components/BlogPageContent";
import { getInitialPostsForPage } from "@/lib/server/public-data";

interface Props {
  params: Promise<{ locale: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const seo = LOCALE_SEO[locale as Locale] ?? LOCALE_SEO.en;
  return buildPageMetadata(locale, {
    title: seo.blog.title,
    description: seo.blog.description,
    path: "/blog",
    keywords: seo.keywords,
  });
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  const initial = await getInitialPostsForPage(locale);
  return (
    <BlogPageContent
      initialPosts={initial.items}
      initialCursor={initial.nextCursor}
      initialHasMore={initial.hasMore}
    />
  );
}
