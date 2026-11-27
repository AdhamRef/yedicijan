"use client";

/**
 * /waqf — waqf shares page, in the same language as the approved zakat page.
 *
 * Compact hero → navy "give a waqf" band: type (general first, designated second) →
 * general: optional field + amount | designated: project + share count → one gold button.
 * Then the open waqf projects (each card preselects itself in the band), the Bir Rumah
 * story with a well photo, the rules, the trust band and the FAQ.
 * Payment goes through the existing donation dialog, unchanged: category mode for a
 * general waqf, campaign mode for a designated one.
 */
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import axios from "axios";
import { useLocale, useTranslations } from "next-intl";
import {
  BadgeCheck, Building2, Check, Droplet, GraduationCap, Heart, Infinity as InfinityIcon, Landmark, Lock, Minus, Plus,
  ScrollText, ShieldCheck, Sparkles, type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import SectionHeading from "@/components/brand/SectionHeading";
import InlineBold from "@/components/InlineBold";
import MosqueIcon from "@/app/[locale]/_components/homepage/MosqueIcon";
import { useCurrency } from "@/context/CurrencyContext";
import { getCurrencySymbol } from "@/hooks/useCampaignValue";
import { formatNumber } from "@/hooks/formatNumber";
import { isolateLtr } from "@/lib/campaign/funding";
import { stripBoldMarkers } from "@/lib/text/inline-bold";

const DonationDialog = dynamic(() => import("@/components/DonationDialog"), { ssr: false });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Campaign = any;
type Category = { id: string; name: string; image?: string | null };
type Mode = "general" | "pick";

/** Every waqf is given in shares; a general-waqf share is $50, the smallest share on the page. */
const GENERAL_SHARE_USD = 50;
/** Optional field for a general waqf; "any" leaves it to the team. */
const FIELDS: { key: string; Icon: LucideIcon | typeof MosqueIcon }[] = [
  { key: "any", Icon: Heart },
  { key: "water", Icon: Droplet },
  { key: "mosques", Icon: MosqueIcon },
  { key: "education", Icon: GraduationCap },
];
/** True while the element with this id is on screen — drives the mobile bar. */
function useInView(id: string) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = document.getElementById(id);
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: "-10% 0px -25% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [id]);
  return on;
}

/** A category the team marked as waqf, by slug or name, in any site language. */
const WAQF_CATEGORY = /waqf|wakaf|vak[ıi]f|وقف|أوقاف/i;

/** Wells, mosques and schools among the site's projects, in any site language. */
const WAQF_PROJECT = /بئر|آبار|مسجد|مساجد|بيوت الله|مدرس|well|mosque|school|kuyu|cami|okul|puits|mosqu[ée]e|[ée]cole|brunnen|moschee|schule|pozo|mezquita|escuela|sumur|masjid|sekolah|po[çc]o|mesquita/i;

/** A well, for the Bir Rumah story — matched on the project's title or slug in any site language. */
const WELL = /بئر|آبار|well|kuyu|sumur|puits|brunnen|pozo|poço/i;

export default function WaqfPageContent() {
  const t = useTranslations("Waqf");
  const tZ = useTranslations("Zakat");
  const tB = useTranslations("Brand");
  const locale = useLocale();
  const { convertToCurrency } = useCurrency();
  const symbol = getCurrencySymbol();
  const conv = (usd: number) => convertToCurrency(usd)?.convertedValue ?? usd;
  const money = (v: number) => isolateLtr(`${symbol}${formatNumber(Math.round(v))}`);

  const [category, setCategory] = useState<Category | null>(null);
  const [projects, setProjects] = useState<Campaign[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      // The waqf category: slug "waqf", or any category the team named as waqf.
      let cat = (await axios.get(`/api/categories/waqf`, { params: { locale } }).catch(() => null))?.data;
      if (!cat?.id) {
        const all = (await axios.get(`/api/categories`, { params: { locale } }).catch(() => null))?.data;
        const list: { id: string; slug?: string; name?: string; image?: string | null }[] = all?.items ?? all ?? [];
        cat = list.find((c) => WAQF_CATEGORY.test(`${c.slug ?? ""} ${c.name ?? ""}`)) ?? null;
      }
      let items = cat?.slug
        ? (await axios.get(`/api/categories/${encodeURIComponent(cat.slug)}/campaigns`, { params: { locale, limit: 24 } }).catch(() => null))?.data?.items ?? []
        : [];
      // Until a waqf category exists: the site's wells, mosques and schools.
      if (!cat?.id) {
        const camps = (await axios.get(`/api/campaigns`, { params: { locale, limit: 60 } }).catch(() => null))?.data?.items ?? [];
        items = camps.filter((c: Campaign) => WAQF_PROJECT.test(`${c.title ?? ""} ${c.slug ?? ""}`));
      }
      if (!alive) return;
      if (cat?.id) setCategory({ id: cat.id, name: cat.name, image: cat.image });
      else setMode("pick");
      setProjects(items);
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [locale]);

  const isShares = (c: Campaign) => c?.fundraisingMode === "SHARES" && Number(c?.sharePriceUSD) > 0;
  /** Every waqf project is given in shares: its own share price, never below $50. */
  const shareUSD = (c: Campaign) => (isShares(c) ? Math.max(GENERAL_SHARE_USD, Number(c.sharePriceUSD)) : GENERAL_SHARE_USD);
  const stats = (p: Campaign) => {
    const raised = conv(p.currentAmount ?? 0);
    const goal = conv(p.targetAmount ?? 0);
    const pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
    const left = p.targetAmount > 0 ? Math.max(0, Math.ceil(((p.targetAmount ?? 0) - (p.currentAmount ?? 0)) / shareUSD(p))) : null;
    return { raised, goal, pct, left };
  };

  // ── Band state ──
  const [mode, setMode] = useState<Mode>("general");
  const [fieldKey, setFieldKey] = useState("any");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => projects.find((p) => p.id === selectedId) ?? projects[0] ?? null, [projects, selectedId]);
  const target = mode === "pick" ? selected : null;
  const [qty, setQty] = useState(1);
  const q = Math.max(1, Math.min(9999, Math.floor(qty) || 1));
  const unitUSD = target ? shareUSD(target) : GENERAL_SHARE_USD;
  const total = conv(unitUSD * q);
  const canGive = mode === "general" ? Boolean(category) : Boolean(target);
  const [open, setOpen] = useState(false);
  const inGive = useInView("give");
  const word = (n: number) => t("shares", { count: n });

  const minShareUSD = GENERAL_SHARE_USD;
  const wellProject = projects.find((p) => WELL.test(`${p.title ?? ""} ${p.slug ?? ""}`) && p.images?.[0]);
  // The hero shows another project, so the well photo stays for the Bir Rumah story.
  const heroImage = projects.find((p) => p !== wellProject && p.images?.[0])?.images?.[0] ?? category?.image ?? "/images/zakat-waqf/wq-mosque.jpg";
  const storyImage = wellProject?.images?.[0] ?? "/images/zakat-waqf/wq-well.jpg";
  const generalImage = category?.image ?? wellProject?.images?.[0] ?? "/images/zakat-waqf/wq-well.jpg";

  return (
    <main className="min-h-screen bg-offwhite">
      {/* ── Hero: compact, light wash ── */}
      <section className="relative isolate overflow-hidden bg-deep text-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- admin uploads can live on any host */}
        {heroImage && <img src={heroImage} alt="" aria-hidden fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-deep/85 via-deep/40 to-deep/0 rtl:bg-gradient-to-l" aria-hidden />
        <div className="absolute inset-0 -z-10 bg-deep/45 lg:hidden" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-deep/60 to-transparent" aria-hidden />
        <div className="mx-auto max-w-7xl px-5 pb-24 pt-6 sm:pb-28 sm:pt-10 lg:px-6 lg:pb-32">
          <nav aria-label="Breadcrumb" className="mb-5 text-[13px] font-semibold text-ice/80">
            <ol className="flex flex-wrap items-center gap-2">
              <li><Link href="/" className="hover:text-white">{tB("home")}</Link></li>
              <li className="text-white/40">/</li>
              <li className="text-white">{t("crumb")}</li>
            </ol>
          </nav>
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <SectionHeading as="h1" tone="dark" eyebrow={t("eyebrow")} title={t("title")} mark={t("titleMark")} subtitle={t("subtitle")} />
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <a href="#give" className="inline-flex h-12 items-center gap-2 rounded-full bg-burgundy px-6 font-extrabold text-white shadow-[0_14px_30px_-14px_rgba(166,36,60,.8)] transition-colors hover:bg-burgundyDark"><Heart className="h-4 w-4" />{t("panelCta")}</a>
                <a href="#rules" className="inline-flex h-12 items-center gap-2 rounded-full border-[1.5px] border-white/40 bg-deep/20 px-5 font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/10"><ScrollText className="h-4 w-4 text-gold" />{t("ctaRules")}</a>
              </div>
              <ul className="mt-5 flex flex-wrap gap-2 text-[12.5px] font-bold text-white/90">
                <li className="inline-flex items-center gap-1.5 rounded-full bg-deep/30 px-3 py-1.5 ring-1 ring-white/15 backdrop-blur-sm"><BadgeCheck className="h-4 w-4 text-gold" />{tZ("chipSince")}</li>
                <li className="inline-flex items-center gap-1.5 rounded-full bg-deep/30 px-3 py-1.5 ring-1 ring-white/15 backdrop-blur-sm"><Landmark className="h-4 w-4 text-gold" />{tZ("chipSupervised")}</li>
              </ul>
            </div>
            {(
              <div className="hidden items-center gap-4 rounded-[24px] bg-white/95 p-4 pe-6 text-deep shadow-[0_24px_50px_-24px_rgba(0,0,0,.5)] lg:flex">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gold text-deep"><InfinityIcon className="h-8 w-8" /></span>
                <span>
                  <span className="block text-xs font-bold text-gray-500">{t("heroFrom")}</span>
                  <b className="block text-3xl font-black leading-tight">{money(conv(minShareUSD))}</b>
                  {projects.length > 0 && <span className="text-xs font-bold text-burgundy">{t("heroOpen", { count: projects.length })}</span>}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Give: type toggle + general card / projects, beside a sticky "your waqf" panel ── */}
      <section id="give" className="relative z-10 -mt-16 scroll-mt-24 pb-14 sm:pb-20">
        <div className="mx-auto grid max-w-7xl items-start gap-6 px-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:px-6">
          <div className="rounded-[28px] border border-line bg-white p-4 shadow-[0_30px_70px_-50px_rgba(18,35,57,.6)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" aria-label={t("step1")} className="grid w-full grid-flow-col auto-cols-fr rounded-2xl bg-sand p-1.5 sm:inline-grid sm:w-auto">
                {([["general", InfinityIcon], ["pick", Building2]] as const).filter(([m]) => m === "pick" || !loaded || category).map(([m, Icon]) => (
                  <button key={m} role="tab" type="button" aria-selected={mode === m} onClick={() => setMode(m)}
                    className={`inline-flex min-h-[46px] items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 text-[14px] font-extrabold transition-all sm:px-5 sm:text-[15px] ${mode === m ? "bg-deep text-white shadow-[0_10px_24px_-14px_rgba(18,35,57,.8)]" : "text-deep hover:bg-white/60"}`}>
                    <Icon className={`h-4 w-4 ${mode === m ? "text-gold" : "text-burgundy"}`} />{t(`mode_${m}`)}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500">{t(`mode_${mode}_d`)}</p>
            </div>

            {mode === "general" ? (
              <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-stretch">
                <div className="relative isolate flex min-h-[220px] flex-col justify-end overflow-hidden rounded-[22px] p-5 text-white">
                  {generalImage && <Image src={generalImage} alt="" fill sizes="(max-width: 768px) 100vw, 40vw" className="-z-10 object-cover" />}
                  <span className="absolute inset-0 -z-10 bg-gradient-to-t from-deep via-deep/55 to-deep/10" aria-hidden />
                  <span className="mb-auto inline-flex w-max items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-deep">{t("sharePrice")} <span className="text-burgundy">{money(conv(GENERAL_SHARE_USD))}</span></span>
                  <b className="text-xl font-black">{t("generalTitle")}</b>
                  <span className="mt-1 text-sm leading-6 text-white/85">{t("generalText")}</span>
                </div>
                <div>
                  <p className="mb-3 flex items-center gap-2 text-sm font-extrabold text-deep">{t("stepField")}<span className="rounded-full bg-sand px-2 py-0.5 text-[11px] font-bold text-gray-500">{t("optional")}</span></p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {FIELDS.map(({ key, Icon }) => {
                      const on = fieldKey === key;
                      return (
                        <button key={key} type="button" aria-pressed={on} onClick={() => setFieldKey(key)}
                          className={`flex h-[84px] flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] text-center transition-colors ${on ? "border-deep bg-deep text-white" : "border-line bg-offwhite text-deep hover:border-deep/40"}`}>
                          <Icon className={`h-6 w-6 ${on ? "text-gold" : "text-burgundy"}`} strokeWidth={1.8} />
                          <span className="text-[13px] font-extrabold">{t(`field_${key}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {projects.map((p) => {
                  const { pct, raised, goal, left } = stats(p);
                  const on = selected?.id === p.id;
                  return (
                    <button key={p.id} type="button" aria-pressed={on} onClick={() => setSelectedId(p.id)}
                      className={`group relative flex flex-col overflow-hidden rounded-[22px] border-2 bg-white text-start transition-all ${on ? "border-burgundy shadow-[0_22px_44px_-30px_rgba(166,36,60,.7)]" : "border-line hover:border-deep/30"}`}>
                      <span className="relative block aspect-[16/9] w-full bg-sand">
                        {p.images?.[0] && <Image src={p.images[0]} alt={stripBoldMarkers(p.title)} fill sizes="(max-width: 640px) 100vw, 30vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
                        <span className={`absolute start-3 top-3 grid h-8 w-8 place-items-center rounded-full shadow transition-colors ${on ? "bg-burgundy text-white" : "bg-white/90 text-deep/25"}`}><Check className="h-4 w-4" /></span>
                        <span className="absolute end-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold text-deep shadow">{t("sharePrice")} <span className="text-burgundy">{money(conv(shareUSD(p)))}</span></span>
                      </span>
                      <span className="flex flex-1 flex-col p-4">
                        <b className="line-clamp-2 text-[16px] font-extrabold leading-snug text-deep"><InlineBold text={p.title} /></b>
                        {goal > 0 ? (
                          <span className="mt-auto block pt-3">
                            <span className="block h-2 overflow-hidden rounded-full bg-sand"><span className="block h-full rounded-full bg-gradient-to-l from-burgundy to-gold" style={{ width: `${Math.max(pct, raised > 0 ? 2 : 0)}%` }} /></span>
                            <span className="mt-1.5 flex justify-between gap-2 text-xs font-bold text-gray-500">
                              {raised > 0 ? <span>{t("completed", { percent: pct < 1 ? "<1" : pct })}</span> : <span className="inline-flex items-center gap-1 text-burgundy"><Sparkles className="h-3.5 w-3.5" />{t("beFirst")}</span>}
                              {left != null && <span>{t("sharesLeft", { count: left })}</span>}
                            </span>
                          </span>
                        ) : <span className="mt-auto pt-3 text-xs font-bold text-gray-500">{t("openGoal")}</span>}
                      </span>
                    </button>
                  );
                })}
                {loaded && projects.length === 0 && (
                  <div className="col-span-full flex flex-col items-center gap-3 rounded-[22px] border border-dashed border-line bg-offwhite px-6 py-10 text-center">
                    <Building2 className="h-8 w-8 text-burgundy" />
                    <p className="max-w-sm text-sm leading-6 text-gray-600">{t("noProjects")}</p>
                    <button type="button" onClick={() => setMode("general")} className="inline-flex h-11 items-center gap-2 rounded-xl bg-deep px-5 text-sm font-extrabold text-white"><InfinityIcon className="h-4 w-4 text-gold" />{t("mode_general")}</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Your waqf */}
          <aside aria-live="polite" className="relative isolate overflow-hidden rounded-[28px] bg-deep p-6 text-white shadow-[0_40px_80px_-40px_rgba(18,35,57,.75)] lg:sticky lg:top-28">
            <div className="topo-layer -z-10 text-white/[0.07]" aria-hidden />
            <p className="text-sm font-bold text-gold">{t("panelTitle")}</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/10">
                {mode === "pick" && target?.images?.[0] ? <Image src={target.images[0]} alt="" fill sizes="56px" className="object-cover" /> : <InfinityIcon className="h-7 w-7 text-gold" />}
              </span>
              <span className="min-w-0">
                <b className="line-clamp-2 font-extrabold leading-snug">{mode === "general" ? t("generalTitle") : target ? stripBoldMarkers(target.title) : "—"}</b>
                <span className="text-xs text-ice/75">{mode === "general" && <>{t(`field_${fieldKey}`)}<span className="mx-1.5 text-white/30">·</span></>}{t("perShare", { amount: money(conv(unitUSD)) })}</span>
              </span>
            </div>

            <p className="mt-6 text-xs font-bold text-ice/70">{t("qtyTitle")}</p>
            <div className="mt-2 flex items-center justify-between gap-3 rounded-[22px] bg-white/[0.07] p-2 ring-1 ring-white/10">
              <button type="button" aria-label={t("less")} disabled={q <= 1} onClick={() => setQty(q - 1)}
                className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 transition-colors hover:bg-white/20 active:scale-95 disabled:opacity-40"><Minus className="h-6 w-6" /></button>
              <label className="min-w-0 flex-1 text-center">
                <span className="sr-only">{t("qtyLabel")}</span>
                <input inputMode="numeric" value={q} onChange={(e) => setQty(parseInt(e.target.value.replace(/\D/g, "")) || 1)}
                  className="w-full bg-transparent text-center text-4xl font-black tabular-nums text-white outline-none" />
                <span className="block text-xs font-bold text-ice/70">{t("sharesWord", { count: q })}</span>
              </label>
              <button type="button" aria-label={t("more")} onClick={() => setQty(q + 1)}
                className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gold text-deep transition-transform hover:-translate-y-0.5 active:scale-95"><Plus className="h-6 w-6" /></button>
            </div>
            {target && mode === "pick" && target.targetAmount > 0 && <p className="mt-2 text-center text-xs text-ice/70">{t("shareOfProject", { percent: ((unitUSD * q) / target.targetAmount * 100).toFixed((unitUSD * q) / target.targetAmount < 0.01 ? 2 : 1) })}</p>}

            <div className="mt-5 flex items-baseline justify-between border-t border-white/10 pt-4">
              <span className="text-sm text-ice/80">{t("panelTotal")}</span>
              <b className="text-3xl font-black text-gold">{money(total)}</b>
            </div>
            <button type="button" disabled={!canGive} onClick={() => setOpen(true)}
              className="mt-4 inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-gold text-base font-extrabold text-deep shadow-[0_16px_30px_-16px_rgba(246,188,81,.9)] transition-transform hover:-translate-y-0.5 disabled:opacity-50">
              <Heart className="h-5 w-5" />{t("ctaShares", { shares: word(q), amount: money(total) })}
            </button>
            <ul className="mt-4 space-y-1.5 text-[12.5px] text-ice/75">
              <li className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-gold" />{tZ("secure")}</li>
              <li className="flex items-center gap-1.5"><InfinityIcon className="h-4 w-4 text-gold" />{t("trustForever")}</li>
            </ul>
          </aside>
        </div>
      </section>

      {/* Mobile: one bar with the stepper and the button */}
      {inGive && canGive && !open && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-3 py-2.5 shadow-[0_-12px_30px_-18px_rgba(18,35,57,.45)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-2">
            <div className="flex items-center rounded-2xl bg-sand p-1">
              <button type="button" aria-label={t("less")} disabled={q <= 1} onClick={() => setQty(q - 1)} className="grid h-10 w-10 place-items-center rounded-xl text-deep disabled:opacity-40"><Minus className="h-5 w-5" /></button>
              <span className="w-8 text-center text-lg font-black tabular-nums text-deep">{q}</span>
              <button type="button" aria-label={t("more")} onClick={() => setQty(q + 1)} className="grid h-10 w-10 place-items-center rounded-xl bg-gold text-deep"><Plus className="h-5 w-5" /></button>
            </div>
            <button type="button" onClick={() => setOpen(true)} className="h-12 flex-1 rounded-2xl bg-burgundy px-3 text-sm font-extrabold text-white">{t("cta", { amount: money(total) })}</button>
          </div>
        </div>
      )}

      {/* ── Bir Rumah ── */}
      <section className="bg-sand py-14 sm:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 lg:grid-cols-2 lg:gap-14 lg:px-6">
          <div>
            <SectionHeading eyebrow={t("storyEyebrow")} title={t("storyTitle")} />
            <p className="mt-5 leading-8 text-gray-600">{t("story1")}</p>
            <p className="mt-3 leading-8 text-gray-600">{t("story2")}</p>
            <blockquote className="mt-6 rounded-2xl border border-line bg-white p-5">
              <p className="text-lg font-bold leading-8 text-deep">{t("hadith")}</p>
              <cite className="mt-1 block text-sm font-extrabold not-italic text-burgundy">{t("hadithSource")}</cite>
            </blockquote>
          </div>
          {storyImage && (
            <figure className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] shadow-[0_30px_60px_-36px_rgba(18,35,57,.6)]">
                <Image src={storyImage} alt={wellProject ? stripBoldMarkers(wellProject.title) : ""} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              </div>
              <figcaption className="absolute -bottom-5 start-5 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-deep shadow-[0_18px_40px_-24px_rgba(18,35,57,.6)]">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-deep text-gold"><Droplet className="h-5 w-5" /></span>
                {wellProject ? stripBoldMarkers(wellProject.title) : t("storyEyebrow")}
              </figcaption>
            </figure>
          )}
        </div>
      </section>

      {/* ── Rules ── */}
      <section id="rules" className="scroll-mt-24 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-6">
          <SectionHeading eyebrow={t("rulesEyebrow")} title={t("rulesTitle")} align="center" />
          <ol className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
            {([[InfinityIcon, 1], [Lock, 2], [ShieldCheck, 3]] as const).map(([Icon, i]) => (
              <li key={i} className="flex items-start gap-4 rounded-2xl border border-line bg-white p-5">
                <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-deep text-gold"><Icon className="h-6 w-6" strokeWidth={1.8} /><span className="absolute -end-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-gold text-[11px] font-black text-deep">{i}</span></span>
                <span><b className="block font-extrabold text-deep">{t(`rule${i}`)}</b><span className="mt-0.5 block text-sm leading-6 text-gray-500">{t(`rule${i}_d`)}</span></span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Trust (same timeless band as the zakat page) ── */}
      <section className="relative overflow-hidden bg-deep py-14 text-white sm:py-16">
        <div className="topo-layer text-white/[0.05]" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-6">
          <SectionHeading tone="dark" eyebrow={tZ("trustEyebrow")} title={tZ("trustTitle")} />
          <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-6">
            {[[String(new Date().getFullYear() - 1961), tZ("stat1")], ["23", tZ("stat2")], ["7", tZ("stat3")]].map(([n, l]) => (
              <div key={l} className="border-t-2 border-white/15 pt-4"><b className="block text-xl font-black text-gold sm:text-4xl" dir="ltr" style={{ textAlign: "end" }}>{n}</b><span className="text-xs text-white/70 sm:text-sm">{l}</span></div>
            ))}
          </div>
          <p className="mt-8 flex items-center gap-2 text-sm text-white/70"><ShieldCheck className="h-4 w-4 text-gold" />{tZ("trustNote")}</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHeading eyebrow={t("faqEyebrow")} title={t("faqTitle")} align="center" />
          <div className="mt-8 grid items-start gap-3 lg:grid-cols-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <details key={i} className="group rounded-2xl border border-line bg-white px-5 transition-shadow open:shadow-[0_18px_40px_-30px_rgba(18,35,57,.5)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 font-extrabold text-deep">{t(`q${i}`)}<span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sand text-lg leading-none text-burgundy transition-transform group-open:rotate-45">+</span></summary>
                <p className="pb-4 leading-7 text-gray-600">{t(`a${i}`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {open && mode === "general" && category && (
        <DonationDialog isOpen onClose={() => setOpen(false)} categoryId={category.id} categoryName={category.name} categoryImage={category.image ?? undefined} initialDonationAmount={Math.round(total * 100) / 100} />
      )}
      {open && mode === "pick" && target && (
        <DonationDialog
          isOpen
          onClose={() => setOpen(false)}
          campaignId={target.id}
          campaignTitle={target.title}
          campaignImage={target.images?.[0]}
          targetAmount={target.targetAmount}
          amountRaised={target.currentAmount}
          fundraisingMode="AMOUNT"
          goalType={target.goalType}
          sharePriceUSD={null}
          suggestedDonations={target.suggestedDonations ?? null}
          suggestedTeamSupport={target.suggestedTeamSupport ?? null}
          initialDonationAmount={Math.round(total * 100) / 100}
        />
      )}
    </main>
  );
}
