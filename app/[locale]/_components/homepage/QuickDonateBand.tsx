"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Check, ChevronDown, Heart, Landmark, Lock, Receipt, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { getCurrency, getCurrencySymbol } from "@/hooks/useCampaignValue";
import { formatNumber } from "@/hooks/formatNumber";
import { appendCurrencyQuery, getCurrencyCodeForLinks } from "@/lib/currency-link";
import {
  DEFAULT_SUGGESTED_DONATION_AMOUNTS,
  resolveSuggestedAmountsForCurrency,
} from "@/lib/campaign/suggested-donations";
import { isolateLtr } from "@/lib/campaign/funding";
import type { CampaignCardData } from "../CampaignCard";

const DonationDialog = dynamic(() => import("@/components/DonationDialog"), { ssr: false });

const RESUME_KEY = "quickDonateBandResume";

/** Four presets, skipping the smallest so the first anchor isn't $10. */
function pickPresets(all: number[]): number[] {
  const sorted = [...new Set(all.filter((n) => n > 0))].sort((a, b) => a - b);
  return (sorted.length > 4 ? sorted.slice(1) : sorted).slice(0, 4);
}

/**
 * Navy quick-donate band that overlaps the bottom of the hero: project, four
 * presets with a "most popular" anchor, other amount, one yellow button. Opens
 * the existing DonationDialog, so payment, tracking and sign-in resume are the
 * same as everywhere else.
 */
export default function QuickDonateBand({ campaigns }: { campaigns: CampaignCardData[] }) {
  const t = useTranslations("HomeRedesign");
  const pathname = usePathname();

  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const campaign = campaigns.find((c) => c.id === campaignId) ?? campaigns[0];

  const [currencyCode, setCurrencyCode] = useState("USD");
  const [symbol, setSymbol] = useState("$");
  useEffect(() => {
    setCurrencyCode(getCurrency());
    setSymbol(getCurrencySymbol());
  }, []);

  const presets = useMemo(() => {
    const cfg = campaign?.suggestedDonations ?? { amounts: [...DEFAULT_SUGGESTED_DONATION_AMOUNTS], byCurrency: {} };
    return pickPresets(resolveSuggestedAmountsForCurrency(cfg, currencyCode));
  }, [campaign, currencyCode]);

  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  useEffect(() => {
    setSelected(presets[1] ?? presets[0] ?? null);
    setCustom("");
  }, [presets]);
  const amount = selected ?? (parseFloat(custom) || 0);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const [dialogMounted, setDialogMounted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Re-open checkout after the sign-in redirect the dialog may trigger.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("openQuickDonate") !== "1") return;
    try {
      const raw = sessionStorage.getItem(RESUME_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as { campaignId?: string; amount?: number };
      if (data.campaignId && campaigns.some((c) => c.id === data.campaignId)) setCampaignId(data.campaignId);
      if (data.amount && data.amount > 0) {
        setSelected(null);
        setCustom(String(data.amount));
      }
      sessionStorage.removeItem(RESUME_KEY);
      setDialogMounted(true);
      setDialogOpen(true);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!campaign) return null;

  const label = "mb-2 block text-xs font-bold text-ice/70";

  return (
    <section id="give" aria-label={t("qdTitle")} className="relative z-10 -mt-20 scroll-mt-32 px-4 lg:-mt-24">
      <div className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-deep px-5 py-6 text-white shadow-[0_40px_80px_-40px_rgba(18,35,57,.75)] sm:px-8 lg:px-8">
        <div className="topo-layer -z-10 text-white/[0.08]" aria-hidden />

        <div className="grid items-end gap-5 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.9fr)_auto] lg:gap-6">
          <div className="self-center lg:border-e lg:border-white/15 lg:pe-6">
            <h2 className="text-xl font-extrabold">{t("qdTitle")}</h2>
            <span className="mt-0.5 inline-flex items-center gap-1.5 text-[13px] text-ice/70">
              <Lock className="h-3.5 w-3.5 text-gold" />
              {t("qdHint")}
            </span>
          </div>

          {/* Project */}
          <div ref={menuRef} className="relative">
            <span className={label} id="qd-project-label">{t("qdProject")}</span>
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              aria-labelledby="qd-project-label"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-[52px] w-full items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.08] px-4 text-start font-bold"
            >
              <span className="truncate">{campaign.title}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </button>
            {menuOpen && (
              <ul
                role="listbox"
                className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-auto rounded-2xl bg-white py-1.5 text-deep shadow-2xl"
              >
                {campaigns.map((c) => (
                  <li key={c.id} role="option" aria-selected={c.id === campaign.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setCampaignId(c.id);
                        setMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-start text-sm ${
                        c.id === campaign.id ? "bg-offwhite font-bold text-burgundy" : "hover:bg-offwhite"
                      }`}
                    >
                      <span className="line-clamp-1">{c.title}</span>
                      {c.id === campaign.id && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Amount */}
          <fieldset>
            <legend className={label}>{t("qdAmount")}</legend>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.7fr)]">
              {presets.map((p, i) => {
                const on = selected === p;
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setSelected(p);
                      setCustom("");
                    }}
                    className={`relative h-[52px] rounded-2xl border text-base font-extrabold tabular-nums transition-colors ${
                      on ? "border-white bg-white text-deep" : "border-white/15 bg-white/[0.06] hover:border-white/40"
                    }`}
                  >
                    {i === 1 && (
                      <span className="absolute -top-2.5 inset-x-0 mx-auto w-max rounded-full bg-gold px-2 text-[10px] font-extrabold text-deep">
                        {t("mostPopular")}
                      </span>
                    )}
                    <span dir="ltr">{symbol}{formatNumber(p)}</span>
                  </button>
                );
              })}
              <div className="relative col-span-4 sm:col-span-1">
                <label htmlFor="qd-other" className="sr-only">{t("otherAmount")}</label>
                <input
                  id="qd-other"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  value={custom}
                  placeholder={t("otherAmount")}
                  onChange={(e) => {
                    setCustom(e.target.value);
                    setSelected(null);
                  }}
                  className="h-[52px] w-full rounded-2xl border border-dashed border-white/30 bg-transparent pe-11 ps-3 text-sm font-bold text-white placeholder:text-ice/60 focus:border-gold focus:outline-none"
                />
                <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-xs font-bold text-ice/60">{currencyCode}</span>
              </div>
            </div>
          </fieldset>

          <button
            type="button"
            disabled={amount <= 0}
            onClick={() => {
              setDialogMounted(true);
              setDialogOpen(true);
            }}
            className="inline-flex h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-gold px-8 text-base font-extrabold text-deep transition-colors hover:bg-[#ffc965] disabled:opacity-50"
          >
            <Heart className="h-5 w-5" />
            {amount > 0 ? t("donateCta", { amount: isolateLtr(`${symbol}${formatNumber(amount)}`) }) : t("donateCtaEmpty")}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-4 text-[13px] text-ice/70">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-gold" />{t("trustSecure")}</span>
          <span className="inline-flex items-center gap-1.5"><Receipt className="h-4 w-4 text-gold" />{t("trustReceipt")}</span>
          <Link href="/bank-transfer" className="inline-flex items-center gap-1.5 hover:text-white">
            <Landmark className="h-4 w-4 text-gold" />
            {t("trustBank")}
          </Link>
        </div>
      </div>

      {dialogMounted && (
        <DonationDialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          campaignId={campaign.id}
          campaignTitle={campaign.title}
          campaignImage={campaign.images?.[0] || undefined}
          targetAmount={campaign.targetAmount ?? 0}
          amountRaised={campaign.currentAmount ?? 0}
          goalType={campaign.goalType}
          fundraisingMode={campaign.fundraisingMode}
          sharePriceUSD={campaign.sharePriceUSD ?? null}
          suggestedShareCounts={campaign.suggestedShareCounts ?? null}
          suggestedDonations={campaign.suggestedDonations ?? null}
          shareLabels={campaign.shareLabels ?? null}
          initialDonationAmount={amount > 0 ? amount : undefined}
          authCallbackUrl={
            typeof window !== "undefined"
              ? appendCurrencyQuery(`${pathname}?openQuickDonate=1#give`, getCurrencyCodeForLinks())
              : undefined
          }
          onAuthCheckpoint={() => {
            try {
              sessionStorage.setItem(RESUME_KEY, JSON.stringify({ campaignId: campaign.id, amount }));
            } catch {
              /* ignore */
            }
          }}
        />
      )}
    </section>
  );
}
