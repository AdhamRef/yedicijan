"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { appendCurrencyQuery, getCurrencyCodeForLinks } from "@/lib/currency-link";
import { useSearchParams } from "next/navigation";
import { getCurrency, getCurrencySymbol } from "@/hooks/useCampaignValue";
import { formatNumber } from "@/hooks/formatNumber";
import { useCurrency } from "@/context/CurrencyContext";
import { useTranslations } from "next-intl";

const DonationDialog = dynamic(() => import("@/components/DonationDialog"), { ssr: false });
import CategoryIcon from "@/components/CategoryIcon";
import { Heart, ShoppingCart, Zap } from "lucide-react";
import { LOW_FUNDING_PERCENT, isolateLtr } from "@/lib/campaign/funding";
import {
  DEFAULT_SUGGESTED_DONATION_AMOUNTS,
  resolveSuggestedAmountsForCurrency,
  type SuggestedDonationsConfig,
} from "@/lib/campaign/suggested-donations";
import type { SuggestedTeamSupportConfig } from "@/lib/campaign/suggested-team-support";
import { resolveSharePlural, type ShareLabelsConfig } from "@/lib/campaign/share-labels";
import { useLocale } from "next-intl";

const RESUME_KEY = "campaignDonateResume";
const FALLBACK_IMG = "https://i.ibb.co/N2zVsqfg/calisma-alanlarimiz-egitim-sektoru.jpg";

// 4:3 crop — matches the aspect-[4/3] container used everywhere.
// q_auto:eco is ~30% smaller than q_auto:good with no perceptible quality loss for thumbnails;
// f_auto serves AVIF/WebP automatically based on the Accept header.
function buildImgSrc(src: string, width = 640, height = 480): string {
  if (!src.includes("res.cloudinary.com")) return src;
  return src.replace(
    /\/upload\//,
    `/upload/f_auto,q_auto:eco,w_${width},h_${height},c_fill,g_auto/`
  );
}

export interface CampaignCardData {
  id: string;
  slug?: string | null;
  images: string[];
  title: string;
  description: string;
  currentAmount: number;
  targetAmount: number;
  progress?: number;
  showProgress?: boolean;
  fundraisingMode?: string;
  goalType?: string;
  sharePriceUSD?: number | null;
  suggestedShareCounts?: { counts: number[]; priceByCurrency?: Record<string, number> } | null;
  suggestedDonations?: SuggestedDonationsConfig | null;
  suggestedTeamSupport?: SuggestedTeamSupportConfig | null;
  /** Per-campaign custom unit names ("sheep" / "meal" / etc.) keyed by locale. */
  shareLabels?: ShareLabelsConfig | null;
  category?: { id?: string; slug?: string | null; name?: string; icon?: string | null } | null;
  /** Number of donations so far (returned by /api/campaigns). */
  donationCount?: number;
}

type DonationDialogCampaignContext = {
  goalType?: string;
  fundraisingMode?: string;
  sharePriceUSD?: number | null;
  suggestedShareCounts?: { counts: number[]; priceByCurrency?: Record<string, number> } | null;
  suggestedDonations?: SuggestedDonationsConfig | null;
  suggestedTeamSupport?: SuggestedTeamSupportConfig | null;
  shareLabels?: ShareLabelsConfig | null;
};

interface CampaignCardProps {
  campaign: CampaignCardData;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  isFeatured?: boolean;
  compact?: boolean;
  listView?: boolean;
  /** Taller image area — used on the /campaigns listing, where cards have room to breathe. */
  tall?: boolean;
}

export function CampaignCard({ campaign, className, onClick, isFeatured = false, listView = false, tall = false, compact = false }: CampaignCardProps) {
  const t = useTranslations("CampaignsPage");
  const tr = useTranslations("Brand");
  const locale = useLocale();
  const { convertToCurrency } = useCurrency();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [donationOpen, setDonationOpen] = useState(false);
  const [donationDialogMounted, setDonationDialogMounted] = useState(false);
  const [donationContext, setDonationContext] = useState<DonationDialogCampaignContext | null>(null);
  const [addToCartMode, setAddToCartMode] = useState(false);

  const snapshotDonationContext = (): DonationDialogCampaignContext => ({
    goalType: campaign.goalType,
    fundraisingMode: campaign.fundraisingMode,
    sharePriceUSD: campaign.sharePriceUSD ?? null,
    suggestedShareCounts: campaign.suggestedShareCounts ?? null,
    shareLabels: campaign.shareLabels ?? null,
    suggestedDonations: campaign.suggestedDonations ?? null,
    suggestedTeamSupport: campaign.suggestedTeamSupport ?? null,
  });

  const progress = Math.min(Number(campaign.progress ?? 0), 100);
  // Before exchange rates load (and always during SSR) fall back to the USD base
  // value rather than 0 — "$0 of $0" was rendered on first paint and caused a
  // hydration mismatch for every USD visitor.
  const raised = convertToCurrency(Math.round(campaign.currentAmount)).convertedValue ?? Math.round(campaign.currentAmount);
  const target = convertToCurrency(Math.round(campaign.targetAmount)).convertedValue ?? Math.round(campaign.targetAmount);
  const symbol = getCurrencySymbol();
  const currencyCode = getCurrency();
  const isOpenGoal = String(campaign.goalType ?? "").toLowerCase() === "open";
  const hasTargetAmount = Number(campaign.targetAmount) > 0;
  const hideBottomStats = isOpenGoal && !hasTargetAmount;

  useEffect(() => {
    if (searchParams.get("openCampaignDonation") !== "1") return;
    try {
      const stored = typeof window !== "undefined" ? sessionStorage.getItem(RESUME_KEY) : null;
      if (!stored) return;
      const data = JSON.parse(stored) as { campaignId?: string } & DonationDialogCampaignContext;
      if (data.campaignId !== campaign.id) return;
      sessionStorage.removeItem(RESUME_KEY);
      setDonationContext({
        goalType: data.goalType ?? campaign.goalType,
        fundraisingMode: data.fundraisingMode ?? campaign.fundraisingMode,
        sharePriceUSD: data.sharePriceUSD ?? campaign.sharePriceUSD ?? null,
        suggestedShareCounts: data.suggestedShareCounts ?? campaign.suggestedShareCounts ?? null,
        suggestedDonations: data.suggestedDonations ?? campaign.suggestedDonations ?? null,
        suggestedTeamSupport: data.suggestedTeamSupport ?? campaign.suggestedTeamSupport ?? null,
        shareLabels: data.shareLabels ?? campaign.shareLabels ?? null,
      });
      setDonationDialogMounted(true);
      setDonationOpen(true);
    } catch { /* ignore */ }
    router.replace(appendCurrencyQuery(pathname, getCurrencyCodeForLinks()));
  }, [
    searchParams,
    campaign.id,
    campaign.goalType,
    campaign.fundraisingMode,
    campaign.sharePriceUSD,
    campaign.suggestedShareCounts,
    campaign.suggestedDonations,
    pathname,
    router,
  ]);

  const [presetAmount, setPresetAmount] = useState<number | undefined>(undefined);
  const handleDonateClick = (e: React.MouseEvent, amount?: number) => {
    e.preventDefault();
    e.stopPropagation();
    setPresetAmount(amount);
    setAddToCartMode(false);
    setDonationContext(snapshotDonationContext());
    setDonationDialogMounted(true);
    setDonationOpen(true);
  };

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAddToCartMode(true);
    setDonationContext(snapshotDonationContext());
    setDonationDialogMounted(true);
    setDonationOpen(true);
  };

  const storeDonationResume = () => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(
      RESUME_KEY,
      JSON.stringify({
        campaignId: campaign.id,
        ...snapshotDonationContext(),
      })
    );
  };

  const rawImgSrc = campaign.images[0] || FALLBACK_IMG;
  const imgSrc = buildImgSrc(rawImgSrc);

  const detailHref = `/campaign/${campaign.slug || campaign.id}`;

  // Three one-tap amounts from the campaign's own presets for the active currency.
  const quickAmounts = (() => {
    const cfg = campaign.suggestedDonations ?? { amounts: [...DEFAULT_SUGGESTED_DONATION_AMOUNTS], byCurrency: {} };
    const all = [...new Set(resolveSuggestedAmountsForCurrency(cfg, currencyCode).filter((n) => n > 0))].sort((x, y) => x - y);
    const pool = all.length > 3 ? all.slice(1) : all;
    return pool.slice(0, 3);
  })();

  return (
    <>
      {/* ── Mobile horizontal list row (listView only, hidden on sm+) ── */}
      {listView && !isFeatured && (
        <div className="sm:hidden flex flex-row bg-white shape-card overflow-hidden shadow-soft">
          <Link href={detailHref} onClick={onClick} className="relative flex-shrink-0 w-28 aspect-square">
            <Image src={buildImgSrc(rawImgSrc, 320, 320)} alt={campaign.title} fill sizes="112px" className="object-cover" draggable={false} />
          </Link>
          <div className="flex flex-col justify-between flex-1 min-w-0 px-3 py-2.5">
            {campaign.category?.name && (
              <p className="text-[10px] text-gray-500 font-semibold truncate mb-0.5">{campaign.category.name}</p>
            )}
            <Link href={detailHref} onClick={onClick}>
              <h3 className="text-[13px] font-extrabold text-deep line-clamp-2 leading-snug">{campaign.title}</h3>
            </Link>
            <div className="mt-1.5">
              <div className="w-full bg-gray-100 rounded-full h-[3px] mb-1">
                <div className="bg-gradient-to-r from-burgundy to-gold h-[3px] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black text-deep">{symbol}{formatNumber(raised)} <span className="font-normal text-gray-400">{t("raised") || "جُمع"}</span></p>
                <button onClick={handleDonateClick} className="shape-chip text-[10px] font-bold text-white bg-burgundy hover:bg-burgundyDark px-2.5 py-1 transition-colors flex-shrink-0">
                  {t("donateNow") || "تبرع"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Card view (always on sm+, always when not listView) ──
            Brand guide 2025: photo on top with an area chip, title below on white,
            honest funding state, then one-tap amount chips that open checkout
            with the amount already filled in (Human Appeal / Ehsan pattern). */}
      <div
        className={`${listView && !isFeatured ? "hidden sm:flex" : "flex"} project-card group/card relative flex-col overflow-hidden rounded-[28px] border border-line bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(18,35,57,.35)] ${className ?? ""}`}
      >
        <Link href={detailHref} prefetch={true} onClick={onClick} className="relative block">
          <div className={`relative w-full overflow-hidden bg-sand ${tall || isFeatured ? "aspect-[4/3] sm:aspect-[16/11]" : "aspect-[4/3]"}`}>
            <Image
              src={isFeatured ? buildImgSrc(rawImgSrc, 960, 720) : imgSrc}
              alt={campaign.title}
              fill
              sizes={isFeatured ? "(max-width: 640px) 90vw, 50vw" : "(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"}
              className="object-cover transition-transform duration-700 ease-out group-hover/card:scale-[1.04]"
              draggable={false}
              priority={isFeatured}
              quality={70}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

            <div className="absolute inset-x-3.5 top-3.5 flex items-start justify-between gap-2">
              {campaign.category?.name ? (
                <span className="inline-flex max-w-[70%] items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold text-deep">
                  <CategoryIcon name={campaign.category.icon} className="h-3.5 w-3.5 flex-shrink-0 text-burgundy" />
                  <span className="truncate">{campaign.category.name}</span>
                </span>
              ) : <span />}
              {isFeatured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-burgundy px-3 py-1 text-xs font-extrabold text-white">
                  <Zap className="h-3 w-3 fill-white" />
                  {t("featuredBadge")}
                </span>
              )}
            </div>
          </div>
        </Link>

        <div className={`flex flex-1 flex-col ${compact ? "gap-3 p-3.5 sm:p-4" : "gap-3.5 p-5"}`}>
          <Link href={detailHref} onClick={onClick}>
            <h3 className={`font-extrabold leading-snug text-deep transition-colors group-hover/card:text-burgundy ${isFeatured ? "text-xl sm:text-2xl" : compact ? "text-[15px] sm:text-base" : "text-[17px] sm:text-lg"} line-clamp-2`}>
              {campaign.title}
            </h3>
          </Link>

          {campaign.showProgress !== false && !hideBottomStats && progress < LOW_FUNDING_PERCENT ? (
            /* Barely funded: "$0 of $12,000" reads as "nobody trusts this", so lead
               with an invitation and the goal, and show donors once there are any. */
            <div className="flex items-center justify-between gap-2 shape-chip bg-offwhite px-3 py-2.5">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-burgundy">
                <Heart className="h-3.5 w-3.5" fill="currentColor" aria-hidden />
                {tr("beFirst")}
              </span>
              <span className="whitespace-nowrap text-[11px] font-semibold text-gray-500 tabular-nums">
                {tr("goal", { amount: isolateLtr(`${symbol}${formatNumber(target)}`) })}
              </span>
            </div>
          ) : campaign.showProgress !== false && !hideBottomStats ? (
            <div className="space-y-2">
              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{t("raised") || "جُمع"}</p>
                  <p className="text-deep font-black leading-none mt-0.5 whitespace-nowrap tabular-nums">{symbol}{formatNumber(raised)}</p>
                </div>
                <div className="text-end min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{t("goal") || "الهدف"}</p>
                  <p className="text-gray-500 font-semibold leading-none mt-0.5 whitespace-nowrap tabular-nums">{symbol}{formatNumber(target)}</p>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-gradient-to-r from-burgundy to-gold rounded-full h-1.5 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            /* No fixed goal (open goal / shares) — branded "ongoing support" panel
               so the body is never visually empty between the image and the buttons. */
            // <div className="flex items-center justify-between gap-3 shape-chip border border-gray-100 bg-offwhite px-3.5 py-2.5">
            //   <div className="min-w-0 max-sm:flex max-sm:justify-between max-sm:items-center max-sm:w-full">
            //     <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{t("raised") || "جُمع"}</p>
            //     <p className="text-deep font-black leading-none mt-1 text-lg whitespace-nowrap tabular-nums">{symbol}{formatNumber(raised)}</p>
            //   </div>
            //   {/* Shares / open-goal label — hidden on small screens to keep cards compact */}
            //   <span className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-burgundy/[0.07] px-3 py-1.5 text-[11px] font-bold text-burgundy">
            //     <Heart className="w-3.5 h-3.5 fill-burgundy/30" />
            //     {campaign.fundraisingMode === "SHARES"
            //       ? resolveSharePlural(campaign.shareLabels ?? null, locale) ?? t("sharesCampaignLabel")
            //       : t("openGoalLabel")}
            //   </span>
            // </div>
            <></>
          )}

          {compact ? (
            /* Narrow contexts (suggestions, two-up grids): one clear action + cart. */
            <div className="mt-auto flex items-center gap-2">
              <button
                onClick={(e) => handleDonateClick(e)}
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-burgundy px-3 text-[13px] font-extrabold text-white transition-colors hover:bg-burgundyDark"
              >
                <Heart className="h-4 w-4" />
                {t("donateNow") || "تبرع الآن"}
              </button>
              <button
                onClick={handleAddToCartClick}
                aria-label={t("addToCart") || "Add to cart"}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-deep transition-colors hover:border-deep"
              >
                <ShoppingCart className="h-4 w-4" />
              </button>
            </div>
          ) : (
          <>
          {/* Quick amounts — open checkout with the amount pre-filled. */}
          <div className="mt-auto grid grid-cols-[repeat(3,minmax(0,1fr))_auto] gap-2 pt-1">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={(e) => handleDonateClick(e, amt)}
                className="h-11 rounded-xl border border-line text-sm font-extrabold tabular-nums text-deep transition-colors hover:border-deep hover:bg-deep hover:text-white"
              >
                <span dir="ltr">{symbol}{formatNumber(amt)}</span>
              </button>
            ))}
            <button
              onClick={(e) => handleDonateClick(e)}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-burgundy px-4 text-sm font-extrabold text-white transition-colors hover:bg-burgundyDark"
            >
              <Heart className="h-4 w-4" />
              {t("donateNow") || "تبرع الآن"}
            </button>
          </div>
          <div className="flex items-center justify-between border-t border-line pt-3 text-[13px] font-bold">
            <Link href={detailHref} onClick={onClick} className="text-deep/70 transition-colors hover:text-burgundy">
              {t("details") || "Detay"}
            </Link>
            <button
              onClick={handleAddToCartClick}
              className="inline-flex items-center gap-1.5 text-deep/70 transition-colors hover:text-burgundy"
            >
              <ShoppingCart className="h-4 w-4" />
              {t("addToCart") || "Add to cart"}
            </button>
          </div>
          </>
          )}
        </div>
      </div>

      {donationDialogMounted && (
      <DonationDialog
        isOpen={donationOpen}
        onClose={() => {
          setDonationOpen(false);
          setDonationContext(null);
          setAddToCartMode(false);
        }}
        oneTimeOnly={addToCartMode}
        campaignId={campaign.id}
        campaignTitle={campaign.title}
        campaignImage={rawImgSrc}
        fundraisingMode={donationContext?.fundraisingMode ?? campaign.fundraisingMode}
        targetAmount={campaign.targetAmount}
        amountRaised={campaign.currentAmount}
        goalType={donationContext?.goalType ?? campaign.goalType}
        sharePriceUSD={donationContext?.sharePriceUSD ?? campaign.sharePriceUSD ?? null}
        suggestedShareCounts={donationContext?.suggestedShareCounts ?? campaign.suggestedShareCounts ?? null}
        shareLabels={donationContext?.shareLabels ?? campaign.shareLabels ?? null}
        suggestedDonations={donationContext?.suggestedDonations ?? campaign.suggestedDonations ?? null}
        suggestedTeamSupport={donationContext?.suggestedTeamSupport ?? campaign.suggestedTeamSupport ?? null}
        authCallbackUrl={
          typeof window !== "undefined"
            ? appendCurrencyQuery(
                `${pathname}?openCampaignDonation=1`,
                getCurrencyCodeForLinks()
              )
            : undefined
        }
        onAuthCheckpoint={storeDonationResume}
        initialDonationAmount={addToCartMode ? undefined : presetAmount}
      />
      )}
    </>
  );
}

export default CampaignCard;
