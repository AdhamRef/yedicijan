"use client";

import React, { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { ArrowLeft } from "lucide-react";

import { type SlideItem } from "./HeroSlider";
import HomeHero from "./HomeHero";
import QuickDonateBand from "./QuickDonateBand";
import SevenWorlds from "./SevenWorlds";
import ReachSection from "./ReachSection";
import HowItWorks from "./HowItWorks";
import TrustBand from "./TrustBand";
import MobileDonateBar from "./MobileDonateBar";
import CampaignCard from "../CampaignCard";
import SectionHeading from "@/components/brand/SectionHeading";
import CategoryIcon from "@/components/CategoryIcon";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import type { CampaignCardData } from "../CampaignCard";

// LiveDonationsTicker is a non-critical floating widget — keep it client-only
// and below-the-fold so it doesn't pull its chunk into the LCP critical path.
const LiveDonationsTicker = dynamic(() => import("@/components/LiveDonationsTicker"), {
  loading: () => null,
  ssr: false,
});

interface CategoryItem {
  id: string;
  slug?: string | null;
  name: string;
  image?: string | null;
  icon?: string | null;
  order?: number;
}

interface PostItem {
  id: string;
  slug?: string | null;
  title: string;
  description: string | null;
  image: string | null;
  published: boolean;
  createdAt: string;
}

interface HomePageContentProps {
  firstHeroImage?: string | null;
  initialSlides?: SlideItem[];
  initialCampaigns: CampaignCardData[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  initialCategories: CategoryItem[];
  initialPosts: PostItem[];
}


const HomePage: React.FC<HomePageContentProps> = ({
  firstHeroImage,
  initialSlides = [],
  initialCampaigns,
  initialCategories,
  initialPosts,
}) => {
  const t = useTranslations("HomePage");
  const tBlog = useTranslations("BlogCard");
  const locale = useLocale();

  // Mirror SSR-provided data into local state. If SSR's internal fetches failed
  // (e.g. base-URL resolution mismatch, internal API timeout), we'll populate them
  // from the browser as a fallback so the homepage is never blank.
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);

  useEffect(() => {
    if (categories.length > 0) return;
    let cancelled = false;
    fetch(`/api/categories?locale=${locale}&limit=12&sortBy=order`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setCategories(items as CategoryItem[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  useEffect(() => {
    if (posts.length > 0) return;
    let cancelled = false;
    axios
      .get("/api/posts", { params: { locale, limit: 3 } })
      .then((r) => {
        if (cancelled) return;
        const items = Array.isArray(r.data?.items) ? r.data.items : [];
        setPosts(items as PostItem[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const tr = useTranslations("HomeRedesign");
  const campaignImages = initialCampaigns.flatMap((c) => c.images?.slice(0, 1) ?? []).filter(Boolean);

  return (
    <div className="bg-offwhite">
      <HomeHero
        slides={initialSlides.length ? initialSlides : firstHeroImage ? [{ id: "fallback", title: "", description: "", image: firstHeroImage, showButton: false, buttonText: "", buttonLink: "", order: 0 }] : []}
        fallbackImages={campaignImages.slice(0, 2)}
      />

      {initialCampaigns.length > 0 && <QuickDonateBand campaigns={initialCampaigns} />}

      <SevenWorlds />

      {/* ── Open projects ── */}
      <section id="projects" className="border-y border-line bg-white py-16 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-6">
          <div className="mb-7 flex flex-col gap-5 sm:mb-10 sm:gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading eyebrow={tr("projectsEyebrow")} title={tr("projectsTitle")} mark={tr("projectsMark")} />
            {categories.length > 0 && (
              <nav aria-label={tr("projectsEyebrow")} className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
                <Link href="/campaigns" className="inline-flex h-11 shrink-0 items-center rounded-full bg-deep px-5 text-sm font-bold text-white">
                  {tr("all")}
                </Link>
                {categories.slice(0, 6).map((c) => (
                  <Link
                    key={c.id}
                    href={`/category/${c.slug || c.id}`}
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-bold text-deep/80 transition-colors hover:border-deep hover:text-deep"
                  >
                    <CategoryIcon name={c.icon} className="h-4 w-4" />
                    {c.name}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          <Suspense fallback={null}>
            {/* Phones: one swipeable row (snap) instead of six stacked cards;
                tablets and up: grid. */}
            <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
              {initialCampaigns.slice(0, 6).map((c, i) => (
                <CampaignCard key={c.id} campaign={c} isFeatured={i === 0} className="w-[84%] shrink-0 snap-center sm:w-auto" />
              ))}
            </div>
          </Suspense>

          <div className="mt-8 text-center sm:mt-10">
            <Link
              href="/campaigns"
              className="inline-flex h-12 items-center gap-2 rounded-full border-[1.5px] border-deep/20 px-7 font-bold text-deep transition-colors hover:border-deep"
            >
              {tr("allProjects")}
              <ArrowLeft className="h-4 w-4 ltr:rotate-180" />
            </Link>
          </div>
        </div>
      </section>

      <ReachSection />
      <HowItWorks images={campaignImages.slice(2, 4).length === 2 ? campaignImages.slice(2, 4) : campaignImages.slice(0, 2)} />
      <TrustBand />

      {/* ── News ── */}
      {posts.length > 0 && (
        <section className="border-t border-line bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-6">
            <div className="mb-10 flex items-end justify-between gap-6">
              <SectionHeading eyebrow={tr("newsEyebrow")} title={tr("newsTitle")} mark={tr("newsMark")} />
              <Link href="/blog" className="hidden shrink-0 items-center gap-2 text-sm font-extrabold text-burgundy sm:inline-flex">
                {t("viewAll")}
                <ArrowLeft className="h-4 w-4 ltr:rotate-180" />
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {posts.slice(0, 3).map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug || post.id}`}
                  className="group overflow-hidden rounded-[28px] border border-line bg-white transition-shadow hover:shadow-[0_30px_60px_-30px_rgba(18,35,57,.35)]"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-sand">
                    {post.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="line-clamp-2 text-lg font-extrabold leading-snug text-deep group-hover:text-burgundy">{post.title}</h3>
                    {post.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">{post.description}</p>}
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-burgundy">
                      {tBlog("readMore")}
                      <ArrowLeft className="h-4 w-4 ltr:rotate-180" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <LiveDonationsTicker />
      <MobileDonateBar />
    </div>
  );
};

export default HomePage;
