"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Search, HandHeart, ArrowRight, SlidersHorizontal, X, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import CampaignCard from "@/app/[locale]/_components/CampaignCard";
import { useDebounce } from "use-debounce";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import CategoryIcon from "@/components/CategoryIcon";

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
}

const CampaignsPage = ({
  initialCampaigns = [],
  initialCategories = [],
  initialHasMore = false,
  initialTotal = initialCampaigns.length,
}: CampaignsPageContentProps = {}) => {
  const t = useTranslations("CampaignsPage");
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [loading, setLoading] = useState(initialCampaigns.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filters, setFilters] = useState<FilterState>({ sortBy: "newest", minAmount: 0, maxAmount: 100000000 });
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
    const matchesSearch = (c.title || "").toLowerCase().includes(searchQuery.toLowerCase()) || (c.description || "").toLowerCase().includes(searchQuery.toLowerCase());
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

  const handleFilterChange = (key: keyof FilterState, value: number | string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleCategoryChange = (categoryId: string) => {
    if (categoryId === selectedCategory) return;
    setSelectedCategory(categoryId);
  };

  const hasActiveFilters = filters.sortBy !== "newest" || filters.minAmount !== 0 || filters.maxAmount !== 100000000;
  const resultCountLabel = totalCount > sortedCampaigns.length
    ? `${sortedCampaigns.length} / ${totalCount}`
    : String(sortedCampaigns.length);
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
      <section className="relative hero-pattern text-white">
        <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 pt-12 pb-24">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-ice/70 text-xs mb-8">
            <Link href="/" className="hover:text-white transition-colors">{t("home") || "Home"}</Link>
            <ChevronRight className={`w-3 h-3 ${isRTL ? "rotate-180" : ""}`} />
            <span className="text-white/90 font-medium">{t("campaigns") || "Campaigns"}</span>
          </div>

          {/* Title */}
          <div className="max-w-2xl">
            <div className="gold-mark mb-6" />
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
              {t("campaigns") || "Projeler"}
            </h1>
            <p className="mt-5 text-lg leading-8 text-ice">
              {t("heroDescription") || "Support meaningful causes and make a lasting difference in people's lives."}
            </p>
          </div>
        </div>
      </section>

      {/* ── Search bar — floats between hero and tabs ── */}
      <div className="relative z-30 max-w-2xl mx-auto px-4 -mt-8">
        <div className="bg-white shape-card shadow-lift p-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${isRTL ? "right-3" : "left-3"}`} />
            <input
              type="text"
              placeholder={t("searchPlaceholder") || "Search campaigns..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isRTL ? "pr-9 pl-3" : "pl-9 pr-3"} py-2.5 shape-chip text-sm text-ink bg-offwhite outline-none focus:bg-white transition-colors`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? "left-3" : "right-3"} text-gray-400 hover:text-gray-600`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
              <Sheet>
                <SheetTrigger asChild>
                  <button className={`shape-button relative flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors flex-shrink-0 text-white ${hasActiveFilters ? "bg-gold text-deep" : "bg-burgundy hover:bg-burgundyDark"}`}>
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("filter") || "Filter"}</span>
                    {hasActiveFilters && (
                      <span className="absolute -top-1.5 -end-1.5 w-4 h-4 rounded-full bg-deep text-gold text-[10px] font-bold flex items-center justify-center">!</span>
                    )}
                  </button>
                </SheetTrigger>
                <SheetContent dir={isRTL ? "rtl" : "ltr"} className="w-full sm:max-w-sm">
                  <SheetHeader className="pb-4 border-b border-gray-100">
                    <SheetTitle className="flex items-center gap-2 text-start">
                      <SlidersHorizontal className="w-4 h-4 text-[#A5243D]" />
                      {t("filterOptions") || "Filter Options"}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t("sortBy") || "Sort By"}</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: "newest", label: t("newest") || "Newest" },
                          { value: "amount-high", label: t("amountHigh") || "Highest Goal" },
                          { value: "amount-low", label: t("amountLow") || "Lowest Goal" },
                          { value: "progress", label: t("progress") || "Progress" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => handleFilterChange("sortBy", opt.value)}
                            className={`shape-chip px-3 py-2 text-xs font-semibold border transition-colors ${filters.sortBy === opt.value ? "bg-burgundy text-white border-burgundy" : "bg-white text-gray-600 border-gray-200 hover:border-burgundy/50"}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t("targetAmountRange") || "Target Amount"}</h3>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 mb-1 block">{t("minAmount") || "Min"}</label>
                          <input
                            type="number"
                            value={filters.minAmount}
                            onChange={(e) => handleFilterChange("minAmount", Number(e.target.value))}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#A5243D] focus:ring-2 focus:ring-[#A5243D]/20 outline-none transition-all"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 mb-1 block">{t("maxAmount") || "Max"}</label>
                          <input
                            type="number"
                            value={filters.maxAmount}
                            onChange={(e) => handleFilterChange("maxAmount", Number(e.target.value))}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#A5243D] focus:ring-2 focus:ring-[#A5243D]/20 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setFilters({ sortBy: "newest", minAmount: 0, maxAmount: 100000000 })}
                      className="w-full shape-button py-2.5 border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-offwhite transition-colors"
                    >
                      {t("resetFilters") || "Reset Filters"}
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div className="bg-offwhite border-b border-gray-200/70 shadow-sm sticky top-16 lg:top-[104px] z-20">
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-3">
          <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => handleCategoryChange("all")}
              className={`shape-chip flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 border ${
                selectedCategory === "all"
                  ? "bg-burgundy text-white border-burgundy shadow-soft"
                  : "bg-white text-ink border-gray-200 hover:border-burgundy/50 hover:text-burgundy"
              }`}
            >
              <HandHeart className="w-3.5 h-3.5" />
              {t("allCampaigns") || "All"}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                dir={isRTL ? "rtl" : "ltr"}
                onClick={() => handleCategoryChange(cat.id)}
                className={`shape-chip flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 border ${
                  selectedCategory === cat.id
                    ? "bg-burgundy text-white border-burgundy shadow-soft"
                    : "bg-white text-ink border-gray-200 hover:border-burgundy/50 hover:text-burgundy"
                }`}
              >
                {cat.campaignCount != null && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${selectedCategory === cat.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                    {cat.campaignCount}
                  </span>
                )}
                <CategoryIcon name={cat.icon} className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Campaign Grid ── */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        {/* Results count */}
        {!loading && sortedCampaigns.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{isRefreshingList ? "..." : resultCountLabel}</span>{" "}
              {t("resultsFound") || "campaigns found"}
            </p>
            {hasActiveFilters && (
              <button
                onClick={() => setFilters({ sortBy: "newest", minAmount: 0, maxAmount: 100000000 })}
                className="flex items-center gap-1 text-xs text-[#A5243D] font-semibold hover:underline"
              >
                <X className="w-3 h-3" /> {t("clearFilters") || "Clear filters"}
              </button>
            )}
          </div>
        )}

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
                className="mt-4 text-[#A5243D] text-sm font-semibold hover:underline"
              >
                {t("clearSearch") || "Clear search"}
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity ${isRefreshingList ? "opacity-50" : "opacity-100"}`}>
              {sortedCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
              {/* Inline loading more skeletons */}
              {isLoadingMore && sortedCampaigns.length > 0 && Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={`more-${i}`} />
              ))}
            </div>
            {isRefreshingList && sortedCampaigns.length === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={`refresh-${i}`} />)}
              </div>
            )}
          </div>
        )}

        {hasMore && sortedCampaigns.length > 0 && !isRefreshingList && (
          <div ref={loadMoreRef} className="h-1" aria-hidden="true" />
        )}

        {/* Load more */}
        {hasMore && !isLoadingMore && !isRefreshingList && sortedCampaigns.length > 0 && (
          <div className="text-center mt-12">
            <button
              onClick={loadMore}
              className="shape-button inline-flex items-center gap-2 bg-burgundy hover:bg-burgundyDark text-white font-semibold px-8 py-3 transition-all shadow-soft hover:shadow-lift hover:-translate-y-0.5"
            >
              {t("loadMore") || "Load More"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {isLoadingMore && sortedCampaigns.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        )}
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
