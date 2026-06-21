"use server";

import axios from "axios";
import Image from "next/image";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import React from "react";
import { prisma } from "@/lib/prisma";
import { isObjectId, pickLocaleSlug, whereByIdOrAnyLocaleSlug } from "@/lib/slug";
import { pickTranslation } from "@/lib/i18n/translation-fallback";
import {
  LOCALE_SEO,
  OG_LOCALE_MAP,
  SITE_URL,
  buildLocalizedAlternates,
} from "@/lib/seo";
import type { Locale } from "@/lib/seo";
// server-side messages loader

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { ar as dateAr } from "date-fns/locale";
import Link from "next/link";
import ShareButton from "./_components/ShareButton";
import BlogPostContent from "./_components/BlogPostContent";
import {
  computeCampaignProgressPercent,
  normalizeGoalType,
  FUNDRAISING_SHARES,
  GOAL_TYPE_OPEN,
} from "@/lib/campaign/campaign-modes";
import { LocalizedSharePrice } from "@/components/LocalizedSharePrice";

interface BlogPostProps {
  params: Promise<{ locale: string; postId: string }>;
}

async function fetchPostForSeo(idOrSlug: string) {
  return prisma.post.findFirst({
    where: whereByIdOrAnyLocaleSlug(idOrSlug),
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      image: true,
      updatedAt: true,
      translations: {
        select: { locale: true, title: true, description: true, image: true, slug: true },
      },
    },
  });
}

// Generate metadata for the blog post page (SEO with translated title +
// per-locale hreflang/canonical using each locale's own translation slug)
export async function generateMetadata(args: BlogPostProps): Promise<Metadata> {
  const params = await args.params.catch(() => null);
  const locale = (params?.locale as string) || "ar";
  const postId = params?.postId as string | undefined;
  const seo = LOCALE_SEO[locale as Locale] ?? LOCALE_SEO.en;
  // Always anchor canonical to the requested URL so the parent layout's
  // `/{locale}` canonical can never leak through if metadata building fails.
  const requestedCanonical = postId
    ? `${SITE_URL}/${locale}/blog/${encodeURIComponent(postId)}`
    : `${SITE_URL}/${locale}/blog`;

  try {
    if (!postId) {
      return {
        title: seo.blog.title,
        description: seo.blog.description,
        alternates: { canonical: requestedCanonical },
      };
    }

    const post = await fetchPostForSeo(postId);
    if (!post) {
      return {
        title: seo.blog.title,
        description: seo.blog.description,
        alternates: { canonical: requestedCanonical },
        robots: { index: false, follow: true },
      };
    }

    const t = pickTranslation(post.translations, locale);
    const titleText = (t?.title || post.title || seo.blog.title).trim();
    const descriptionText = ((t?.description || post.description) || seo.blog.description).slice(0, 160);
    const imageUrl =
      (t as { image?: string | null } | undefined)?.image ||
      post.image ||
      `${SITE_URL}/og-image.jpg`;

    let alternates: { canonical: string; languages?: Record<string, string> };
    try {
      alternates = buildLocalizedAlternates({
        basePath: "/blog",
        baseSlug: post.slug,
        translations: post.translations,
        fallback: post.id,
        currentLocale: locale,
      });
    } catch (err) {
      console.error("Failed to build alternates for blog post", err);
      alternates = { canonical: requestedCanonical };
    }

    const fullTitle = `${titleText} | ${seo.siteName}`;

    return {
      title: fullTitle,
      description: descriptionText,
      keywords: seo.keywords,
      alternates,
      openGraph: {
        title: fullTitle,
        description: descriptionText,
        images: [{ url: imageUrl, width: 1200, height: 630, alt: titleText }],
        url: alternates.canonical,
        siteName: seo.siteName,
        locale: OG_LOCALE_MAP[locale as Locale] ?? "en_US",
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title: fullTitle,
        description: descriptionText,
        images: [imageUrl],
      },
      robots: { index: true, follow: true },
    };
  } catch (err) {
    console.error("Failed to generate metadata", err);
    return {
      title: seo.blog.title,
      description: seo.blog.description,
      alternates: { canonical: requestedCanonical },
    };
  }
}

export default async function BlogPost({ params: paramsPromise }: BlogPostProps) {
  const params = await paramsPromise;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://gozbebekleri.org";
  const locale = params.locale || "ar";
  const msgs = await import(`../../../../i18n/messages/${locale}.json`);
  const t = (k: string) => msgs?.default?.Blog?.[k] ?? k;

  // Redirect to the canonical per-locale slug when the URL doesn't match — e.g.
  // after a language switch keeps the previous locale's slug, or when the URL
  // uses the ObjectId.
  try {
    const post = await prisma.post.findFirst({
      where: whereByIdOrAnyLocaleSlug(params.postId),
      select: {
        id: true,
        slug: true,
        translations: { select: { locale: true, slug: true } },
      },
    });
    if (post) {
      const canonical = pickLocaleSlug(post.slug, post.translations, locale) ?? post.id;
      if (params.postId !== canonical && (isObjectId(params.postId) || params.postId !== post.id)) {
        redirect(`/${locale}/blog/${encodeURIComponent(canonical)}`);
      }
    }
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("Failed to resolve canonical post slug", err);
  }

  // Fetch the post and similar posts (API already returns localized fields)
  const res = await axios.get(`${baseUrl}/api/posts/${params.postId}`, { params: { locale } });
  const { post, similarPosts } = res.data;

  // Helper to pick a localized value: prefer a top-level localized field, then translations array, then post.fieldAR/EN/FR
  const pickLocalized = (obj, field) => {
    if (!obj) return "";
    if (obj[field]) return obj[field];
    if (Array.isArray(obj.translations)) {
      const tr = obj.translations.find((t) => t.locale === locale);
      if (tr && tr[field]) return tr[field];
    }
    const suffixed = obj[`${field}${locale.toUpperCase()}`];
    if (suffixed) return suffixed;
    return "";
  };

  const localizedTitle = pickLocalized(post, "title");
  const localizedDescription = pickLocalized(post, "description");
  const localizedContent = pickLocalized(post, "content");
  const categoryName = pickLocalized(post?.category, "name");

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Post not found</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-100">
      <div className="min-h-screen pt-10 pb-10 relative max-w-7xl mx-auto">
        <Progress className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent" value={0} />
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <Card className="overflow-hidden">
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{categoryName}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: locale === 'ar' ? dateAr : undefined }) : ''}
                    </span>
                  </div>
                  <CardTitle className="text-3xl font-bold leading-tight">{localizedTitle}</CardTitle>
                </CardHeader>

                <div className="relative w-full aspect-video overflow-hidden">
                  <Image src={post?.image || "https://i.ibb.co/N2zVsqfg/calisma-alanlarimiz-egitim-sektoru.jpg"} alt={localizedTitle || "Post Image"} fill sizes="(max-width: 768px) 100vw, 66vw" className="object-cover" />
                </div>

                <CardContent className="p-6">
                  {localizedDescription && <p className="lead text-muted-foreground">{localizedDescription}</p>}
                  <Separator className="my-6" />
                  <BlogPostContent content={localizedContent} />
                </CardContent>

                <CardFooter>
                  <ShareButton label={t('sharePost')} copiedMessage={t('linkCopied')} url={`https://gozbebekleri.org/${locale}/blog/${post?.slug || params.postId}`} />
                </CardFooter>
              </Card>
            </div>

            <aside className="flex flex-col gap-4 sticky top-[6.5rem] self-start">
              {(() => {
                const raw = post.campaigns ?? (post.campaign ? [post.campaign] : []);
                const list = raw as {
                  id: string;
                  slug?: string | null;
                  title: string;
                  currentAmount: number;
                  targetAmount: number;
                  images?: string[];
                  goalType?: string;
                  fundraisingMode?: string;
                  sharePriceUSD?: number | null;
                  suggestedShareCounts?: unknown;
                }[];
                if (!list.length) return null;
                return (
                  <Card className="overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold">{t("relatedCampaign")}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex flex-col gap-4">
                      {list.map((camp) => {
                        const g = normalizeGoalType(camp.goalType);
                        const showBar = g !== GOAL_TYPE_OPEN;
                        const progress = showBar
                          ? computeCampaignProgressPercent(
                              camp.currentAmount,
                              camp.targetAmount,
                              g
                            )
                          : 0;
                        const remaining = Math.max(0, camp.targetAmount - camp.currentAmount);
                        const isShares = camp.fundraisingMode === FUNDRAISING_SHARES;
                        return (
                          <Link
                            key={camp.id}
                            href={`/${locale}/campaign/${camp.slug || camp.id}`}
                            className="group block rounded-xl overflow-hidden border border-gray-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-[#A5243D]/30"
                          >
                            <div className="relative aspect-[4/2.5] overflow-hidden bg-gray-100">
                              <Image
                                src={camp.images?.[0] || "https://i.ibb.co/N2zVsqfg/calisma-alanlarimiz-egitim-sektoru.jpg"}
                                alt={camp.title}
                                fill
                                sizes="(max-width: 768px) 100vw, 400px"
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                              {showBar ? (
                                <div className="absolute top-2 right-2 rounded-lg bg-white/95 px-2 py-0.5 text-xs font-bold text-[#A5243D] shadow-sm">
                                  {progress.toFixed(0)}%
                                </div>
                              ) : (
                                <div className="absolute top-2 right-2 rounded-lg bg-white/95 px-2 py-0.5 text-xs font-bold text-violet-700 shadow-sm">
                                  {isShares ? t("campaignSharesBadge") : t("campaignOpenBadge")}
                                </div>
                              )}
                            </div>
                            <div className="p-3">
                              <h3 className="text-sm font-bold text-gray-900 mb-2 line-clamp-1">
                                {camp.title}
                              </h3>
                              <div className="flex justify-between text-xs mb-1.5 gap-1">
                                <span className="text-gray-700 whitespace-nowrap">
                                  <span className="font-bold text-[#A5243D]">{Number(camp.currentAmount).toLocaleString()}</span> {t("campaignDonations")}
                                </span>
                                {showBar ? (
                                  <span className="text-gray-600 text-right whitespace-nowrap">
                                    {t("campaignRemaining")}{" "}
                                    <span className="font-semibold">{Number(remaining).toLocaleString()}</span>
                                  </span>
                                ) : isShares && camp.sharePriceUSD != null && camp.sharePriceUSD > 0 ? (
                                  <span className="text-gray-600 text-right whitespace-nowrap">
                                    {t("sharePriceUsd")}{" "}
                                    <LocalizedSharePrice
                                      className="font-semibold"
                                      sharePriceUSD={Number(camp.sharePriceUSD)}
                                      suggestedShareCounts={camp.suggestedShareCounts}
                                    />
                                  </span>
                                ) : (
                                  <span className="text-gray-600 text-right whitespace-nowrap">{t("campaignOpenGoal")}</span>
                                )}
                              </div>
                              {showBar ? (
                              <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div
                                  className="bg-[#A5243D] h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              ) : null}
                              <p className="text-center text-xs font-semibold text-[#A5243D] mt-2">{t("donateNow")}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })()}

              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">{t('similarPosts')}</CardTitle>
                </CardHeader>

                <CardContent className="p-4 pt-0 flex flex-col gap-4">
                  {(similarPosts as { id: string; slug?: string | null; title?: string; image?: string }[]).map((sp) => (
                    <Link key={sp.id} href={`/${locale}/blog/${sp.slug || sp.id}`} className="group relative rounded-xl overflow-hidden border bg-background shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                      <div className="relative aspect-[4/2.5] overflow-hidden">
                        <Image src={sp.image || "https://i.ibb.co/N2zVsqfg/calisma-alanlarimiz-egitim-sektoru.jpg"} alt={sp.title || ''} fill sizes="600px" className="object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                      </div>

                      <div className="absolute inset-0 flex flex-col justify-end p-4">
                        <span className="mb-2 inline-block w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{t('article')}</span>
                        <h3 className="text-sm font-bold leading-snug text-white line-clamp-3">{(sp && (sp.title || (Array.isArray(sp.translations) ? (sp.translations.find((t2) => t2.locale === locale)?.title) : undefined) || sp.titleAR || sp.titleEN || sp.titleFR))}</h3>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </aside>

          </div>
        </div>
      </div>
    </div>
  );
}
