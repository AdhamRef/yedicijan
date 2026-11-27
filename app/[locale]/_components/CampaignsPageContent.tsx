"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { HandHeart, ArrowRight, X } from "lucide-react";
import CampaignCard from "@/app/[locale]/_components/CampaignCard";
import { useDebounce } from "use-debounce";
import { useLocale, useTranslations } from "next-intl";
import PageHero from "@/components/brand/PageHero";
import BrandDots from "@/components/brand/BrandDots";
import CategoryIcon from "@/components/CategoryIcon";
import { stripBoldMarkers } from "@/lib/text/inline-bold";

interface Campaign {
  id: string;
  slug?: string | null;
  baseSlug?: string | null;
  images: string[];
  title: string;
  description: string;
  currentAmount: number;
  targetAmount: number;
  videoUrl?: string | null;
  progress?: number;
  showProgress?: boolean;
  goalType?: string;
  fundraisingMode?: string;
  sharePriceUSD?: number | null;
  suggestedShareCounts?: { counts: number[]; priceByCurrency?: Record<string, number> } | null;
  suggestedDonations?: import("@/lib/campaign/suggested-donations").SuggestedDonationsConfig | null;
  isActive?: boolean;
  // Many-to-many: a campaign can belong to multiple categories. `categoryId`
  // is kept as a single-value alias (first category) for legacy code paths.
  categoryId?: string;
  categoryIds?: string[];
  category?: { id?: string; slug?: string | null; name?: string; icon?: string | null } | null;
  categories?: { id?: string; slug?: string | null; name?: string; icon?: string | null }[];
  createdAt: string;
  updatedAt?: string;
  // Admin-set ordering fields. Lower number = higher priority. null = unprioritized.
  priority?: number | null;
  categoryPriority?: number | null;
}

interface Category {
  id: string;
  slug?: string | null;
  baseSlug?: string | null;
  name: string;
  icon?: string | null;
  campaignCount?: number;
}

interface FilterState {
  sortBy: string;
  minAmount: number;
  maxAmount: number;
}

interface CampaignsPageContentProps {
  initialCampaigns?: Campaign[];
  initialCategories?: Category[];
  initialCursor?: string | null;
  initialHasMore?: boolean;
  initialTotal?: number;
  /** First homepage slider image, shown behind the hero. */
  heroImage?: string | null;
}

const CampaignsPage = ({
  initialCampaigns = [],
  initialCategories = [],
  initialHasMore = false,
  initialTotal = initialCampaigns.length,
  heroImage = null,
}: CampaignsPageContentProps = {}) => {
  const t = useTranslations("CampaignsPage");
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [loading, setLoading] = useState(initialCampaigns.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState("all");
  // No filter UI any more; the defaults still feed the API query and the client-side ordering.
  const [filters] = useState<FilterState>({ sortBy: "newest", minAmount: 0, maxAmount: 100000000 });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshingList, setIsRefreshingList] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialTotal);
  const didHydrateRef = useRef(false);
  const requestSeqRef = useRef(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const ITEMS_PER_PAGE = 6;
  const locale = useLocale() as string;
  const isRTL = locale === "ar";

  const fetchData = useCallback(async (pageToLoad = 1) => {
    const requestId = ++requestSeqRef.current;
    const isFirstPage = pageToLoad === 1;
    try {
      setError(null);
      if (isFirstPage) {
        setIsRefreshingList(true);
      } else {
        setIsLoadingMore(true);
      }
      const getCampaignsPage = async (pageNumber: number) =>
        selectedCategory !== "all"
          ? axios.get(`/api/categories/${selectedCategory}/campaigns`, {
              params: { page: pageNumber, limit: ITEMS_PER_PAGE, search: debouncedSearch, locale, ...filters },
            })
          : axios.get("/api/campaigns", {
              params: { page: pageNumber, limit: ITEMS_PER_PAGE, search: debouncedSearch, locale, ...filters },
            });

      const categoriesPromise = !categories.length
        ? axios.get("/api/categories", { params: { locale, counts: true, activeCounts: true, limit: 100 } })
        : Promise.resolve({ data: { items: [] } });

      const [campaignsRes, categoriesRes] = await Promise.all([getCampaignsPage(pageToLoad), categoriesPromise]);
      if (requestId !== requestSeqRef.current) return;
      const campaignsItems = campaignsRes.data.items || campaignsRes.data;
      const newCampaigns = (campaignsItems as Campaign[]).map((campaign) => {
        // Many-to-many: collect all category ids the campaign belongs to.
        // Old API responses may only have `categoryId` / `category` — preserve
        // both shapes so the in-memory filter below works either way.
        const ids = Array.isArray(campaign.categoryIds) && campaign.categoryIds.length > 0
          ? campaign.categoryIds
          : (campaign.categoryId
              ? [campaign.categoryId]
              : campaign.category?.id
                ? [campaign.category.id]
                : selectedCategory !== "all"
                  ? [selectedCategory]
                  : []);
        return {
          ...campaign,
          categoryIds: ids,
          categoryId: ids[0],
          category: {
            ...(campaign.category ?? {}),
            id: campaign.category?.id || ids[0] || (selectedCategory !== "all" ? selectedCategory : ""),
          },
        };
      });
      if (pageToLoad > 1) {
        setCampaigns((prev) => {
          const seen = new Set(prev.map((campaign) => campaign.id));
          const merged = [...prev];
          for (const campaign of newCampaigns) {
            if (!seen.has(campaign.id)) {
              seen.add(campaign.id);
              merged.push(campaign);
            }
          }
          return merged;
        });
      } else {
        setCampaigns(newCampaigns);
      }
      setHasMore(Boolean(campaignsRes.data.hasMore));
      setPage(pageToLoad);
      setTotalCount(Number(campaignsRes.data.total) || newCampaigns.length);
      const catData = categoriesRes.data.items || categoriesRes.data;
      if (catData && !categories.length) setCategories(catData as Category[]);
    } catch (err) {
      if (requestId !== requestSeqRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      if (requestId !== requestSeqRef.current) return;
      setIsLoadingMore(false);
      setIsRefreshingList(false);
      setLoading(false);
    }
  }, [categories.length, debouncedSearch, filters, locale, selectedCategory]);

  useEffect(() => {
    // Skip first run: initial data was provided by the server render.
    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      // If the server returned nothing (empty DB / error), still do a client fetch so the page isn't empty.
      if (initialCampaigns.length === 0) {
        setPage(1);
        setHasMore(true);
        fetchData(1);
      }
      return;
    }
    setPage(1);
    setHasMore(true);
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, selectedCategory, debouncedSearch, locale, initialCampaigns.length]);

  const loadMore = useCallback(() => {
    if (!isRefreshingList && !isLoadingMore && hasMore) fetchData(page + 1);
  }, [fetchData, hasMore, isLoadingMore, isRefreshingList, page]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore || isLoadingMore || isRefreshingList || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "250px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isRefreshingList, loadMore, loading]);

  const filteredCampaigns = useMemo(() => campaigns.filter((c) => {
    if (isRefreshingList) return c.isActive !== false;
    const matchesSearch = stripBoldMarkers(c.title).toLowerCase().includes(searchQuery.toLowerCase()) || (c.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    // Many-to-many membership: any of the campaign's categories matches.
    const ids = c.categoryIds ?? (c.categoryId ? [c.categoryId] : c.category?.id ? [c.category.id] : []);
    const matchesCategory = selectedCategory === "all" || ids.includes(selectedCategory);
    const normalizedTarget = Number(c.targetAmount ?? 0);
    const matchesAmount = normalizedTarget >= filters.minAmount && normalizedTarget <= filters.maxAmount;
    return matchesSearch && matchesCategory && matchesAmount && c.isActive !== false;
  }), [campaigns, filters.maxAmount, filters.minAmount, isRefreshingList, searchQuery, selectedCategory]);

  const sortedCampaigns = useMemo(() => [...filteredCampaigns].sort((a, b) => {
    switch (filters.sortBy) {
      case "amount-high": return b.targetAmount - a.targetAmount;
      case "amount-low": return a.targetAmount - b.targetAmount;
      case "progress": return (b.currentAmount / b.targetAmount) - (a.currentAmount / a.targetAmount);
      default: {
        // Mirror the server's default ordering so admin-set priority isn't clobbered on
        // hydration. When a single category is selected we honor `categoryPriority` first
        // (the per-category reorder dialog writes this), then global `priority`, then newest.
        const aCat = !isRefreshingList && selectedCategory !== "all" ? a.categoryPriority ?? null : null;
        const bCat = !isRefreshingList && selectedCategory !== "all" ? b.categoryPriority ?? null : null;
        if (aCat !== null && bCat !== null && aCat !== bCat) return aCat - bCat;
        if (aCat !== null && bCat === null) return -1;
        if (aCat === null && bCat !== null) return 1;
        const ap = a.priority ?? null;
        const bp = b.priority ?? null;
        if (ap !== null && bp !== null && ap !== bp) return ap - bp;
        if (ap !== null && bp === null) return -1;
        if (ap === null && bp !== null) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    }
  }), [filteredCampaigns, filters.sortBy, isRefreshingList, selectedCategory]);

  const handleCategoryChange = (categoryId: string) => {
    if (categoryId === selectedCategory) return;
    setSelectedCategory(categoryId);
  };

  const showEmptyState = sortedCampaigns.length === 0 && !isLoadingMore && !isRefreshingList;

  if (loading) return <LoadingSkeleton />;

  if (error && sortedCampaigns.length === 0 && !isRefreshingList) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-offwhite">
        <div className="text-center bg-white shape-card p-10 shadow-soft max-w-sm mx-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <X className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-deep font-semibold mb-1">{t("errorTitle") || "Something went wrong"}</p>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => fetchData(1)}
            className="shape-button bg-burgundy hover:bg-burgundyDark text-white px-6 py-2.5 text-sm font-semibold transition-colors"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-offwhite" dir={isRTL ? "rtl" : "ltr"}>
      {/* ── Hero Header ── */}
      <PageHero
        image={heroImage}
        crumbs={[{ href: "/", label: t("home") || "Home" }, { label: t("campaigns") || "Campaigns" }]}
        eyebrow={t("categoryHubTitle")}
        title={t("campaigns") || "Projeler"}
        subtitle={t("heroDescription") || "Support meaningful causes and make a lasting difference in people's lives."}
      />

      {/* ── Categories: one compact row of tabs (scrolls sideways on phones) ── */}
      <section className="relative z-30 mx-auto -mt-6 max-w-7xl px-4 lg:px-8">
        <div className="relative rounded-full border border-line bg-white p-1.5 shadow-[0_18px_40px_-28px_rgba(18,35,57,.45)] sm:w-fit sm:max-w-full">
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[{ id: "all", name: t("allCampaigns") || "All", icon: null as string | null }, ...categories].map((cat) => {
              const on = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-bold transition-colors ${
                    on ? "bg-deep text-white shadow-[0_8px_18px_-10px_rgba(18,35,57,.9)]" : "text-deep/75 hover:bg-sand hover:text-deep"
                  }`}
                >
                  {cat.id === "all" ? <HandHeart className={`h-4 w-4 ${on ? "text-gold" : "text-burgundy"}`} /> : <CategoryIcon name={cat.icon} className={`h-3 w-4 ${on ? "text-gold" : "text-burgundy"}`} />}
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Grid ── */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-10 md:py-12">
        <div>
          <div className="mb-8">
            <h2 className="inline-flex items-center gap-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-deep"><BrandDots className="text-burgundy" />{t("allCampaigns") || "All projects"}</h2>
          </div>

          {error && sortedCampaigns.length > 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {t("errorTitle") || "Something went wrong"}. {t("retry") || "Try again"}
            </div>
          )}

          {isRefreshingList && (
            <div className="mb-5 shape-card border border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-burgundy shadow-soft">
              {t("loading") || "Loading campaigns..."}
            </div>
          )}

          {showEmptyState ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <HandHeart className="w-9 h-9 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-700 mb-1">
                {searchQuery ? t("noResults") : t("noCampaigns")}
              </h3>
              <p className="text-gray-400 text-sm">
                {searchQuery ? t("tryDifferentSearch") : t("checkBackLater")}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-4 text-burgundy text-sm font-semibold hover:underline"
                >
                  {t("clearSearch") || "Clear search"}
                </button>
              )}
            </div>
          ) : (
            <div className="relative">
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7 transition-opacity ${isRefreshingList ? "opacity-50" : "opacity-100"}`}>
                {sortedCampaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} tall />
                ))}
                {isLoadingMore && sortedCampaigns.length > 0 && Array.from({ length: 3 }).map((_, i) => (
                  <CardSkeleton key={`more-${i}`} />
                ))}
              </div>
              {isRefreshingList && sortedCampaigns.length === 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
                  {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={`refresh-${i}`} />)}
                </div>
              )}
            </div>
          )}

          {hasMore && sortedCampaigns.length > 0 && !isRefreshingList && (
            <div ref={loadMoreRef} className="h-1" aria-hidden="true" />
          )}

          {hasMore && !isLoadingMore && !isRefreshingList && sortedCampaigns.length > 0 && (
            <div className="text-center mt-12">
              <button
                onClick={loadMore}
                className="shape-button inline-flex items-center gap-2 bg-burgundy hover:bg-burgundyDark text-white font-semibold px-8 py-3 transition-all shadow-soft hover:shadow-lift hover:-translate-y-0.5"
              >
                {t("loadMore") || "Load More"}
                <ArrowRight className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
              </button>
            </div>
          )}

          {isLoadingMore && sortedCampaigns.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          )}
        </div>
      </section>

    </main>
  );
};

/* ── Skeleton card ── */
const CardSkeleton = () => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
    <div className="relative h-52 bg-gray-100 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.4s_infinite] -translate-x-full" />
    </div>
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded-full bg-gray-100 animate-pulse" />
        <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="h-4 bg-gray-100 rounded animate-pulse w-4/5" />
      <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
      <div className="h-3 bg-gray-100 rounded animate-pulse w-3/5" />
      <div className="h-2 bg-gray-100 rounded-full animate-pulse mt-2" />
      <div className="flex justify-between pt-1">
        <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
        <div className="h-3 w-12 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="h-9 bg-gray-100 rounded-lg animate-pulse mt-1" />
    </div>
  </div>
);

/* ── Full page loading skeleton ── */
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    {/* Hero skeleton */}
    <div className="relative h-64 hero-pattern overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.8s_infinite] -translate-x-full" />
      <div className="relative z-10 flex flex-col items-center justify-center h-full gap-3 px-4">
        <div className="h-3 w-28 bg-white/20 rounded-full animate-pulse" />
        <div className="h-8 w-64 bg-white/20 rounded-xl animate-pulse" />
        <div className="h-3 w-48 bg-white/15 rounded animate-pulse" />
        <div className="h-11 w-full max-w-lg bg-white/20 rounded-2xl animate-pulse mt-4" />
      </div>
    </div>
    {/* Tabs skeleton */}
    <div className="bg-white border-b border-gray-100 px-4 py-3 flex gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-8 w-20 bg-gray-100 rounded-full animate-pulse flex-shrink-0" />
      ))}
    </div>
    {/* Grid skeleton */}
    <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  </div>
);

export default CampaignsPage;
