/* eslint-disable @typescript-eslint/no-explicit-any */
import DonationDialog from "@/components/DonationDialog";
import SharePopup from "@/components/SharePopup";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/context/CurrencyContext";
import { usePathname, useRouter } from "@/i18n/routing";
import { appendCurrencyQuery, getCurrencyCodeForLinks } from "@/lib/currency-link";
import { HandCoins, HandHeart, Share2, ShieldCheck, Lock, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getCurrency, getCurrencySymbol } from "@/hooks/useCampaignValue";
import { LOW_FUNDING_PERCENT, isolateLtr } from "@/lib/campaign/funding";
import {
  DEFAULT_SUGGESTED_DONATION_AMOUNTS,
  resolveSuggestedAmountsForCurrency,
} from "@/lib/campaign/suggested-donations";

// Shared across instances (MainPageDummy renders desktop + mobile sidebars); only one should open the dialog
let openDonationHandledThisLoad = false;

interface DonationSidebarProps {
  campaign: any;
  isMobileSticky?: boolean;
}

const DonationSidebar = ({ campaign, isMobileSticky = false }: DonationSidebarProps) => {
  const t = useTranslations("Campaign");
  const tTrust = useTranslations("SignInDialog");
  const tB = useTranslations("Brand");
  const locale = useLocale() as "ar" | "en" | "fr";
  const { convertToCurrency } = useCurrency();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDonationOpen, setIsDonationOpen] = useState(false);

  // After sign-in redirect: open donation dialog once and clean URL (only one instance handles it)
  useEffect(() => {
    if (searchParams.get("openDonation") !== "1") {
      openDonationHandledThisLoad = false;
      return;
    }
    if (openDonationHandledThisLoad) return;
    openDonationHandledThisLoad = true;
    setIsDonationOpen(true);
    router.replace(appendCurrencyQuery(pathname, getCurrencyCodeForLinks()));
  }, [searchParams, pathname, router]);

  const donationCallbackUrl =
    typeof window !== "undefined"
      ? appendCurrencyQuery(`${pathname}?openDonation=1`, getCurrencyCodeForLinks())
      : undefined;

  // Helper function to get locale-specific property
  const getLocalizedProperty = (obj: any, key: string) => {
    const localeKey = `${key}${locale.charAt(0).toUpperCase() + locale.slice(1)}`;
    return obj[localeKey] || obj[key] || "";
  };

  const formatMoney = (n: number) => {
    const r = convertToCurrency(n);
    if (r?.convertedValue != null && r?.currency) {
      const sym =
        r.currency === "USD"
          ? "$"
          : r.currency === "EUR"
            ? "€"
            : r.currency === "GBP"
              ? "£"
              : r.currency === "TRY"
                ? "₺"
                : r.currency;
      const val =
        typeof r.convertedValue === "number"
          ? r.convertedValue.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })
          : "0";
      return sym + " " + val;
    }
    return (
      "$" +
      (typeof n === "number"
        ? n.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })
        : "0")
    );
  };

  const [presetAmount, setPresetAmount] = useState<number | undefined>(undefined);
  const handleDonate = (amount?: number) => {
    setPresetAmount(typeof amount === "number" ? amount : undefined);
    setIsDonationOpen(true);
  };

  // One-tap presets from the campaign's own amounts (the old sidebar had only a
  // generic button, so every donor started from an empty amount field).
  const [currencyCode, setCurrencyCode] = useState("USD");
  useEffect(() => setCurrencyCode(getCurrency()), []);
  const quickAmounts = (() => {
    const cfg = campaign?.suggestedDonations ?? { amounts: [...DEFAULT_SUGGESTED_DONATION_AMOUNTS], byCurrency: {} };
    const all = [...new Set(resolveSuggestedAmountsForCurrency(cfg, currencyCode).filter((n: number) => n > 0))].sort((a, b) => a - b);
    return (all.length > 4 ? all.slice(1) : all).slice(0, 4);
  })();

  const handleShare = () => {
    setIsShareOpen(true);
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const isOpenGoal = String(campaign.goalType ?? "").toLowerCase() === "open";
  const hasTargetAmount = Number(campaign.targetAmount) > 0;
  const hideAmountAndDonors = isOpenGoal && !hasTargetAmount;
  const showProgress = campaign.showProgress !== false;
  const pct = Math.min(100, Math.max(0, Number(campaign.progress) || 0));

  // Reusable on-brand gradient progress bar
  const ProgressBar = ({ height = "h-2.5" }: { height?: string }) => (
    <div className={`relative w-full ${height} rounded-full bg-gray-200/80 overflow-hidden`}>
      <div
        className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-burgundy via-burgundy to-gold transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );

  const dialogEl = (
    <>
      <SharePopup
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        url={shareUrl}
        title={getLocalizedProperty(campaign, "title")}
        description={getLocalizedProperty(campaign, "description")}
        image={campaign.images[0]}
      />
      <DonationDialog
        isOpen={isDonationOpen}
        onClose={() => setIsDonationOpen(false)}
        campaignTitle={getLocalizedProperty(campaign, "title")}
        campaignImage={campaign.images[0]}
        targetAmount={campaign.targetAmount}
        amountRaised={campaign.amountRaised}
        campaignId={campaign.id}
        suggestedDonations={campaign.suggestedDonations}
        suggestedTeamSupport={campaign.suggestedTeamSupport}
        goalType={campaign.goalType}
        fundraisingMode={campaign.fundraisingMode}
        sharePriceUSD={campaign.sharePriceUSD}
        suggestedShareCounts={campaign.suggestedShareCounts}
        shareLabels={campaign.shareLabels}
        authCallbackUrl={donationCallbackUrl}
        initialDonationAmount={presetAmount}
      />
    </>
  );

  // ── Mobile Sticky Bottom Bar ──
  if (isMobileSticky) {
    return (
      <>
        {dialogEl}
        <div className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-line pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_-12px_rgba(18,35,57,.25)]">
          {/* Thin progress strip flush to the top edge */}
          {!hideAmountAndDonors && showProgress && pct >= LOW_FUNDING_PERCENT && (
            <div className="h-1 w-full bg-gray-100">
              <div
                className="h-full bg-gradient-to-r from-burgundy to-gold transition-[width] duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          <div className="px-4 pt-2.5 pb-3">
            {!hideAmountAndDonors && (
              <div className="flex items-end justify-between mb-2.5">
                {!showProgress || pct < LOW_FUNDING_PERCENT ? (
                  /* Open goal or barely funded: no raw "$15" headline. */
                  <div className="min-w-0">
                    <p className="text-[15px] font-extrabold text-deep leading-tight">{tB("beFirst")}</p>
                    {showProgress && (
                      <p className="mt-0.5 text-[11px] font-medium text-gray-500">
                        {tB("goal", { amount: isolateLtr(formatMoney(campaign.targetAmount)) })}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-gray-500 leading-none mb-1">
                        {`${t("from")} ${formatMoney(campaign.targetAmount)}`}
                      </p>
                      <p className="text-xl font-extrabold text-deep leading-none">{formatMoney(campaign.currentAmount)}</p>
                    </div>
                    <span className="text-sm font-bold text-burgundy tabular-nums">{Math.round(pct)}%</span>
                  </>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => handleDonate()}
                className="flex-1 flex gap-2 shape-button bg-burgundy hover:bg-burgundyDark text-white font-bold py-3.5 text-base transition-all duration-200 shadow-soft hover:shadow-lift"
              >
                <HandCoins className="w-5 h-5" />
                {t("donateNow")}
              </Button>
              <Button
                onClick={handleShare}
                aria-label={t("share")}
                className="flex-shrink-0 flex gap-2 shape-button bg-deep hover:bg-navy text-white font-semibold py-3.5 px-4 border-0 transition-all duration-200 shadow-soft hover:shadow-lift"
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Desktop Card ──
  return (
    <div className="h-full">
      {dialogEl}

      <div className="sticky top-[136px] space-y-4">
        {/* Donation card */}
        <div className="relative bg-white rounded-[28px] border border-line shadow-[0_30px_60px_-36px_rgba(18,35,57,.4)] overflow-hidden">
          {/* Gold accent header strip */}
          <div className="h-1.5 w-full bg-gradient-to-r from-burgundy to-gold" />

          <div className="p-6 lg:p-7">
            {!hideAmountAndDonors ? (
              <>
                {/* Barely funded: lead with an invitation instead of "$15 of $20,800". */}
                {showProgress && pct < LOW_FUNDING_PERCENT ? (
                  <div>
                    <p className="text-2xl font-extrabold leading-snug text-deep">{tB("beFirst")}</p>
                    <p className="mt-1.5 text-sm text-gray-500">
                      {tB("goal", { amount: isolateLtr(formatMoney(campaign.targetAmount)) })}
                    </p>
                  </div>
                ) : (
                <>
                {/* Raised amount */}
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[2.6rem] leading-none font-extrabold text-deep tracking-tight">
                    {formatMoney(campaign.currentAmount)}
                  </span>
                  {showProgress && (
                    <span className="text-sm font-bold text-burgundy bg-burgundy/10 px-2.5 py-1 rounded-full tabular-nums">
                      {Math.round(pct)}%
                    </span>
                  )}
                </div>
                {showProgress && (
                  <p className="mt-1.5 text-sm text-gray-500">
                    {t("outOfGoal")}{" "}
                    <span className="font-bold text-gray-700">{formatMoney(campaign.targetAmount)}</span>
                  </p>
                )}

                {/* Progress bar */}
                {showProgress && (
                  <div className="mt-4">
                    <ProgressBar />
                  </div>
                )}
                </>
                )}

              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-burgundy/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-burgundy" />
                </div>
                <p className="text-base font-semibold text-deep">{t("donateNow")}</p>
              </div>
            )}

            {/* Quick amounts */}
            {campaign.fundraisingMode !== "SHARES" && quickAmounts.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-bold text-gray-500">{tB("chooseAmount")}</p>
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((a: number) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => handleDonate(a)}
                      className="h-12 rounded-xl border border-line text-sm font-extrabold tabular-nums text-deep transition-colors hover:border-deep hover:bg-deep hover:text-white"
                    >
                      <span dir="ltr">{getCurrencySymbol()}{a.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-4 space-y-3">
              <Button
                onClick={() => handleDonate()}
                className="w-full flex gap-2 shape-button bg-burgundy hover:bg-burgundyDark text-white font-bold py-6 text-lg transition-all duration-200 shadow-soft hover:shadow-lift"
              >
                <HandCoins className="w-5 h-5" />
                {t("donateNow")}
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                className="w-full flex gap-2 shape-button bg-white hover:bg-offwhite text-deep font-semibold py-6 text-lg border-2 border-gray-200 hover:border-gold transition-all duration-200"
              >
                <Share2 className="w-5 h-5" />
                {t("share")}
              </Button>
            </div>
          </div>

          {/* Trust footer */}
          <div className="border-t border-gray-100 bg-offwhite/40 px-6 lg:px-7 py-3.5 flex items-center justify-between text-[11px] font-semibold text-gray-500">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              {tTrust("secure")}
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {tTrust("trusted")}
            </span>
            <span className="flex items-center gap-1.5">
              <HandHeart className="w-3.5 h-3.5 text-burgundy" />
              {tTrust("community")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationSidebar;
