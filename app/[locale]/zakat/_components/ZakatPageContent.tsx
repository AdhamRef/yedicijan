"use client";

/**
 * /zakat — zakat al-mal page, in the homepage's visual language.
 *
 * Hero (photo, light wash) → navy "pay my zakat" band like the homepage quick-donate band:
 * country (Syria, Palestine, Sudan, Yemen, Africa) → optional field → amount → one gold
 * button → how it reaches → the eight categories on an orbit like the homepage's seven
 * fields → numbers → FAQ → the calculator last (the hero has a calculator shortcut).
 * Payment goes through the existing donation dialog, unchanged: the chosen country's
 * campaign in the "zakat" category (slug `zakat-<country>`), else the category itself.
 */
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { useLocale, useTranslations } from "next-intl";
import {
  Baby, BadgeCheck, Calculator, Coins, Gem, Store, TrendingUp, Wallet, Camera, ClipboardCheck, Droplets, Globe2, HandCoins, Heart, HeartHandshake, House,
  Landmark, Lock, LockOpen, Luggage, MapPin, MessageCircle, Receipt, ShieldCheck, Shirt, Sprout, Stethoscope, Tent, Truck, Wheat,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import CategoryIcon from "@/components/CategoryIcon";
import SectionHeading from "@/components/brand/SectionHeading";
import { useCurrency } from "@/context/CurrencyContext";
import { getCurrency, getCurrencySymbol } from "@/hooks/useCampaignValue";
import { formatNumber } from "@/hooks/formatNumber";
import { isolateLtr } from "@/lib/campaign/funding";
import { computeZakat, KARAT_PURITY, NISAB_GRAMS, type Karat, type NisabStandard } from "@/lib/zakat/calc";
import type { MetalPriceQuote } from "@/lib/zakat/metal-prices";

const DonationDialog = dynamic(() => import("@/components/DonationDialog"), { ssr: false });

type AssetKey = "cash" | "gold" | "silver" | "investments" | "trade" | "owed";
const ASSETS: { key: AssetKey; Icon: LucideIcon }[] = [
  { key: "cash", Icon: Wallet },
  { key: "gold", Icon: Coins },
  { key: "silver", Icon: Gem },
  { key: "investments", Icon: TrendingUp },
  { key: "trade", Icon: Store },
  { key: "owed", Icon: HandCoins },
];
/** The eight categories of At-Tawbah 9:60, each with an icon for the orbit. */
const MASARIF: { i: number; Icon: LucideIcon }[] = [
  { i: 1, Icon: HandCoins },
  { i: 2, Icon: House },
  { i: 3, Icon: ClipboardCheck },
  { i: 4, Icon: HeartHandshake },
  { i: 5, Icon: LockOpen },
  { i: 6, Icon: Receipt },
  { i: 7, Icon: Sprout },
  { i: 8, Icon: Luggage },
];
/** Zakat destinations, in the order the organisation lists them. */
const DESTS: { key: string; icon: string }[] = [
  { key: "palestine", icon: "flag:PS" },
  { key: "sudan", icon: "flag:SD" },
  { key: "yemen", icon: "flag:YE" },
  { key: "africa", icon: "Globe" },
  { key: "syria", icon: "flag:SY" },
];
/** Optional field of spending; "any" leaves it to the team. */
const FIELDS: { key: string; Icon: LucideIcon }[] = [
  { key: "any", Icon: Heart },
  { key: "food", Icon: Wheat },
  { key: "water", Icon: Droplets },
  { key: "clothing", Icon: Shirt },
  { key: "shelter", Icon: Tent },
  { key: "orphans", Icon: Baby },
  { key: "health", Icon: Stethoscope },
];
/** Base amounts in USD, converted to the site currency. */
const AMOUNTS_USD = [100, 250, 500, 1000];
/** A category the team marked as zakat, by slug or name, in any site language. */
const ZAKAT_CATEGORY = /zakat|zek[aâ]t|زكا/i;
/** Words that name each destination in a campaign title (any site language). */
const COUNTRY_WORDS: Record<string, RegExp> = {
  palestine: /فلسطين|غزة|palestin|filistin|gaza|gazze/i,
  sudan: /السودان|sudan|soudan/i,
  yemen: /اليمن|yemen|y[ée]men|jemen/i,
  africa: /إفريقيا|أفريقيا|افريقيا|africa|afrika|afrique|[áa]frica/i,
  syria: /سوريا|syria|suriye|syrie|syrien|siria|s[íi]ria|suriah/i,
};
/** The site's country category for each destination (slug, name or flag icon, any site language). */
const COUNTRY_CATEGORY: Record<string, RegExp> = {
  palestine: /flag:PS|فلسطين|غزة|palestin|filistin|gaza|gazze/i,
  sudan: /flag:SD|السودان|sudan|soudan/i,
  yemen: /flag:YE|اليمن|yemen|y[ée]men|jemen/i,
  africa: /إفريقيا|أفريقيا|افريقيا|africa|afrika|afrique|[áa]frica/i,
  syria: /flag:SY|سوريا|syria|suriye|syrie|syrien|siria|s[íi]ria|suriah/i,
};
const WHATSAPP = "905306516549";
/** A relief photo among the site's projects (food, baskets, clothing). */
const RELIEF_PHOTO = /سلال|سلة|إطعام|طعام|غذائ|كسوة|ملابس|food|basket|gıda|sepet/i;
const AYAH_103 = "﴿خُذْ مِنْ أَمْوَالِهِمْ صَدَقَةً تُطَهِّرُهُمْ وَتُزَكِّيهِم بِهَا﴾";
const AYAH_60 = "﴿إِنَّمَا الصَّدَقَاتُ لِلْفُقَرَاءِ وَالْمَسَاكِينِ وَالْعَامِلِينَ عَلَيْهَا وَالْمُؤَلَّفَةِ قُلُوبُهُمْ وَفِي الرِّقَابِ وَالْغَارِمِينَ وَفِي سَبِيلِ اللَّهِ وَابْنِ السَّبِيلِ﴾";

type Category = { id: string; name: string; image?: string | null };
type CategoryRow = Category & { slug?: string; icon?: string | null };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CampaignLite = any;

const num = (v: string) => {
  const x = parseFloat(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(x) ? x : 0;
};

export default function ZakatPageContent({ prices }: { prices: MetalPriceQuote }) {
  const t = useTranslations("Zakat");
  const tB = useTranslations("Brand");
  const locale = useLocale();
  const { convertToCurrency } = useCurrency();
  const symbol = getCurrencySymbol();
  const currencyCode = getCurrency();
  const money = (v: number) => isolateLtr(`${symbol}${formatNumber(Math.round(v))}`);
  const rate = convertToCurrency(1)?.convertedValue ?? 1;

  // ── Data: the "zakat" category and its per-country campaigns ──
  const [category, setCategory] = useState<Category | null>(null);
  const [programmes, setProgrammes] = useState<CampaignLite[]>([]);
  const [siteImage, setSiteImage] = useState<string | null>(null);
  const [countryCats, setCountryCats] = useState<Record<string, Category>>({});
  const [catsLoaded, setCatsLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      // One call for every category: the zakat one (slug "zakat" or named so) and the country ones.
      const all = (await axios.get(`/api/categories`, { params: { locale, limit: 100 } }).catch(() => null))?.data;
      const list: CategoryRow[] = all?.items ?? all ?? [];
      const cat = list.find((c) => c.slug === "zakat") ?? list.find((c) => ZAKAT_CATEGORY.test(`${c.slug ?? ""} ${c.name ?? ""}`)) ?? null;
      const byCountry: Record<string, Category> = {};
      for (const d of DESTS) {
        const c = list.find((x) => x !== cat && COUNTRY_CATEGORY[d.key].test(`${x.slug ?? ""} ${x.name ?? ""} ${x.icon ?? ""}`));
        if (c) byCountry[d.key] = { id: c.id, name: c.name, image: c.image };
      }
      const items = cat?.slug
        ? (await axios.get(`/api/categories/${encodeURIComponent(cat.slug)}/campaigns`, { params: { locale, limit: 24 } }).catch(() => null))?.data?.items ?? []
        : [];
      // A relief photo from the site's own projects for the hero, until the category has one.
      let photo: string | null = null;
      if (!cat?.image && !items[0]?.images?.[0]) {
        const camps = (await axios.get(`/api/campaigns`, { params: { locale, limit: 40 } }).catch(() => null))?.data?.items ?? [];
        photo = camps.find((c: CampaignLite) => RELIEF_PHOTO.test(c.title ?? "") && c.images?.[0])?.images?.[0] ?? null;
      }
      if (!alive) return;
      if (cat?.id) setCategory({ id: cat.id, name: cat.name, image: cat.image });
      setCountryCats(byCountry);
      setCatsLoaded(true);
      setProgrammes(items);
      setSiteImage(photo);
    })();
    return () => {
      alive = false;
    };
  }, [locale]);

  // ── Pay band ──
  const [destPick, setDest] = useState<string>(DESTS[0].key);
  // Countries that can be paid on the site: a zakat campaign/category, or the country's own category.
  const payable = (key: string) =>
    Boolean(category) || Boolean(countryCats[key]) || programmes.some((p: CampaignLite) => p.slug === `zakat-${key}` || COUNTRY_WORDS[key]?.test(p.title ?? ""));
  const dests = DESTS.filter((d) => !catsLoaded || payable(d.key));
  const dest = dests.some((d) => d.key === destPick) ? destPick : dests[0]?.key ?? DESTS[0].key;
  const [fieldKey, setFieldKey] = useState<string>("any");
  // The country's campaign in the zakat category: slug `zakat-<country>`, else its name in the title.
  const chosen =
    programmes.find((p: CampaignLite) => p.slug === `zakat-${dest}`) ??
    programmes.find((p: CampaignLite) => COUNTRY_WORDS[dest]?.test(p.title ?? "")) ??
    null;
  const presets = AMOUNTS_USD.map((usd) => Math.round(usd * rate));
  const [amount, setAmount] = useState<number | null>(null);
  const [other, setOther] = useState("");
  const payAmount = other ? num(other) : amount ?? presets[1];
  // Where the money is recorded: the country's zakat campaign, else the zakat category, else the
  // site's category for that country. Payment is on the site only, so a country with none of
  // them (no category for it yet) is not offered until the team adds one.
  const payCategory = chosen ? null : category ?? countryCats[dest] ?? null;
  const canPay = payAmount > 0 && Boolean(chosen || payCategory);
  const canPress = canPay;
  const [dialogOpen, setDialogOpen] = useState(false);
  const pay = () => {
    if (canPay) setDialogOpen(true);
  };

  // ── Calculator ──
  const [goldPrice, setGoldPrice] = useState("");
  const [silverPrice, setSilverPrice] = useState("");
  useEffect(() => {
    if (prices.goldPerGramUSD) setGoldPrice((prices.goldPerGramUSD * rate).toFixed(2));
    if (prices.silverPerGramUSD) setSilverPrice((prices.silverPerGramUSD * rate).toFixed(2));
  }, [prices.goldPerGramUSD, prices.silverPerGramUSD, rate]);

  const [active, setActive] = useState<Set<AssetKey>>(new Set(["cash", "gold"]));
  const [v, setV] = useState<Record<string, string>>({});
  const [karat, setKarat] = useState<Karat>("21");
  const [standard, setStandard] = useState<NisabStandard>(locale === "tr" ? "goldDiyanet" : "gold85");
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setV((p) => ({ ...p, [k]: e.target.value }));
  const has = (k: AssetKey) => active.has(k);

  const result = useMemo(
    () =>
      computeZakat(
        {
          cash: has("cash") ? num(v.cash ?? "") : 0,
          investments: has("investments") ? num(v.investments ?? "") : 0,
          tradeStock: has("trade") ? num(v.tradeStock ?? "") : 0,
          tradeReceivables: has("trade") ? num(v.tradeReceivables ?? "") : 0,
          owedToYou: has("owed") ? num(v.owed ?? "") : 0,
          goldGrams: has("gold") ? num(v.gold ?? "") : 0,
          goldKarat: karat,
          silverGrams: has("silver") ? num(v.silver ?? "") : 0,
          debts: num(v.debts ?? ""),
        },
        { goldPerGram: num(goldPrice), silverPerGram: num(silverPrice) },
        standard,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [v, karat, standard, goldPrice, silverPrice, active],
  );

  /** The calculator hands its figure to the pay band — one payment path on the page. */
  const applyCalculated = () => {
    setOther(String(Math.round(result.zakat * 100) / 100));
    setAmount(null);
    document.getElementById("pay")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const heroImage = category?.image ?? programmes[0]?.images?.[0] ?? siteImage ?? "/images/zakat-waqf/zk-baskets.jpg";

  const field = (id: string, label: string, unit: React.ReactNode, hint?: string) => (
    <div>
      <label htmlFor={`z-${id}`} className="mb-1.5 block text-sm font-bold text-deep">{label}</label>
      <div className="flex min-h-[50px] items-center gap-2 rounded-2xl border-[1.5px] border-line bg-offwhite px-3 focus-within:border-deep focus-within:bg-white">
        <input id={`z-${id}`} inputMode="decimal" dir="ltr" placeholder="0" value={v[id] ?? ""} onChange={set(id)} className="min-h-[48px] w-full flex-1 bg-transparent text-end text-base outline-none" />
        <span className="whitespace-nowrap text-sm text-gray-500">{unit}</span>
      </div>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );

  const bandLabel = (n: number, text: string, extra?: React.ReactNode) => (
    <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-ice/70">
      <span className="grid h-5 w-5 place-items-center rounded-md bg-white/10 text-[11px] text-gold">{n}</span>
      {text}
      {extra}
    </p>
  );
  const calcStep = (n: number, text: string) => (
    <p className="mb-4 flex items-center gap-2.5 text-[17px] font-black text-deep">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-deep text-xs text-gold">{n}</span>
      {text}
    </p>
  );
  // Countries and fields: one compact row of pills, like the projects page's category row
  // (scrolls sideways on phones, wraps from sm up).
  const pillRow = "flex gap-1 overflow-x-auto rounded-full bg-white/[0.06] p-1.5 ring-1 ring-white/10 [scrollbar-width:none] sm:flex-wrap sm:rounded-[22px] [&::-webkit-scrollbar]:hidden";
  const pill = (on: boolean) =>
    `flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-bold transition-colors ${on ? "bg-white text-deep shadow-[0_8px_18px_-10px_rgba(0,0,0,.6)]" : "text-ice/85 hover:bg-white/10 hover:text-white"}`;

  return (
    <main className="min-h-screen bg-offwhite">

      {/* ── Hero: compact, light wash over the photo ── */}
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
              <p className="mt-4 inline-flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-2xl bg-deep/40 px-4 py-2.5 ring-1 ring-white/10 backdrop-blur-sm">
                <span lang="ar" dir="rtl" className="text-[15px] leading-7 text-white sm:text-lg sm:leading-8">{AYAH_103}</span>
                <cite className="text-xs font-bold not-italic text-gold">{t("ayahRef")}</cite>
                {locale !== "ar" && <span className="w-full text-sm text-white/80">{t("ayahMeaning")}</span>}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <a href="#pay" className="inline-flex h-12 items-center gap-2 rounded-full bg-burgundy px-6 font-extrabold text-white shadow-[0_14px_30px_-14px_rgba(166,36,60,.8)] transition-colors hover:bg-burgundyDark"><Heart className="h-4 w-4" />{t("payCta")}</a>
                <a href="#calc" className="inline-flex h-12 items-center gap-2 rounded-full border-[1.5px] border-white/40 bg-deep/20 px-5 font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/10"><Calculator className="h-4 w-4 text-gold" />{t("calcCta")}</a>
              </div>
            </div>
            <a href="#calc" aria-label={t("calcCta")} className="group hidden items-center gap-4 rounded-[24px] bg-white/95 p-4 pe-6 text-deep shadow-[0_24px_50px_-24px_rgba(0,0,0,.5)] transition-transform hover:-translate-y-0.5 lg:flex">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gold text-deep"><Calculator className="h-8 w-8" /></span>
              <span>
                <b className="block text-3xl font-black leading-none" dir="ltr">2.5%</b>
                <span className="text-sm font-bold text-burgundy">{t("rateName")}</span>
                <span className="mt-0.5 block text-xs font-bold text-gray-500 group-hover:text-deep">{t("calcCta")} ←</span>
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Pay band (homepage quick-donate style) ── */}
      <section id="pay" aria-label={t("payTitle")} className="relative z-10 -mt-20 scroll-mt-28 px-4">
        <div className="relative isolate mx-auto max-w-7xl rounded-[28px] bg-deep px-5 py-6 text-white shadow-[0_40px_80px_-40px_rgba(18,35,57,.75)] sm:px-8 sm:py-7">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[28px]" aria-hidden><div className="topo-layer text-white/[0.08]" /></div>

          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-xl font-extrabold">{t("payTitle")}</h2>
              <span className="mt-0.5 inline-flex items-center gap-1.5 text-[13px] text-ice/70"><Lock className="h-3.5 w-3.5 text-gold" />{t("payText")}</span>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-7">
            <fieldset className="min-w-0">
              <legend className="contents">{bandLabel(1, t("step1"))}</legend>
              <div className={pillRow}>
                {dests.map((d) => {
                  const on = dest === d.key;
                  return (
                    <button key={d.key} type="button" aria-pressed={on} onClick={() => setDest(d.key)} className={pill(on)}>
                      <CategoryIcon name={d.icon} className={`h-3 w-4 ${d.icon === "Globe" ? (on ? "text-burgundy" : "text-gold") : ""}`} />
                      {t(`dest_${d.key}`)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="min-w-0">
              <legend className="contents">{bandLabel(2, t("stepField"), <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-ice/80">{t("optional")}</span>)}</legend>
              <div className={pillRow}>
                {FIELDS.map(({ key, Icon }) => {
                  const on = fieldKey === key;
                  return (
                    <button key={key} type="button" aria-pressed={on} onClick={() => setFieldKey(key)} className={pill(on)}>
                      <Icon className={`h-4 w-4 ${on ? "text-burgundy" : "text-gold"}`} strokeWidth={1.8} />
                      {t(`field_${key}`)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <div className="mt-5 grid grid-cols-1 items-end gap-4 border-t border-white/10 pt-5 lg:grid-cols-[minmax(0,1fr)_auto]">
            <fieldset className="min-w-0">
              <legend className="contents">{bandLabel(3, t("step2"))}</legend>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.6fr)]">
                {presets.map((a) => {
                  const on = !other && (amount ?? presets[1]) === a;
                  return (
                    <button key={a} type="button" aria-pressed={on} onClick={() => { setAmount(a); setOther(""); }}
                      className={`h-[52px] rounded-2xl border text-base font-extrabold tabular-nums transition-colors ${on ? "border-white bg-white text-deep" : "border-white/15 bg-white/[0.06] hover:border-white/40"}`}>
                      {money(a)}
                    </button>
                  );
                })}
                <div className="relative col-span-4 sm:col-span-1">
                  <label htmlFor="z-other" className="sr-only">{t("otherAmount")}</label>
                  <input id="z-other" inputMode="decimal" value={other} placeholder={t("otherAmount")} onChange={(e) => setOther(e.target.value)}
                    className="h-[52px] w-full rounded-2xl border border-dashed border-white/30 bg-transparent pe-12 ps-3 text-sm font-bold text-white placeholder:text-ice/60 focus:border-gold focus:outline-none" />
                  <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ice/60">{currencyCode}</span>
                </div>
              </div>
            </fieldset>
            <div className="lg:min-w-[260px]">
              <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-bold text-ice/80 lg:justify-start">
                <CategoryIcon name={DESTS.find((d) => d.key === dest)?.icon} className={`h-3.5 w-5 ${dest === "africa" ? "text-gold" : ""}`} />
                {t(`dest_${dest}`)}<span className="text-white/30">·</span>{t(`field_${fieldKey}`)}
              </p>
              <button type="button" disabled={!canPress} onClick={pay}
                className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gold px-7 text-base font-extrabold text-deep shadow-[0_16px_30px_-16px_rgba(246,188,81,.9)] transition-transform hover:-translate-y-0.5 disabled:opacity-50">
                <Heart className="h-5 w-5" />{t("payWith", { amount: money(payAmount) })}
              </button>
            </div>
          </div>

          <ul className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-ice/75">
            <li className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-gold" />{t("secure")}</li>
            <li className="inline-flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-gold" />{t("chipSince")}</li>
            <li className="inline-flex items-center gap-1.5"><Globe2 className="h-4 w-4 text-gold" />{t("chipCountries")}</li>
            <li className="inline-flex items-center gap-1.5"><Landmark className="h-4 w-4 text-gold" />{t("chipSupervised")}</li>
          </ul>
        </div>
      </section>

      {/* ── How it reaches (homepage numbered rows) ── */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-6">
          <SectionHeading eyebrow={t("howEyebrow")} title={t("howTitle")} align="center" />
          <ol className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
            {([[MapPin, 1], [Truck, 2], [Camera, 3]] as const).map(([Icon, i]) => (
              <li key={i} className="flex items-start gap-4 rounded-2xl border border-line bg-white p-5">
                <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-deep text-gold"><Icon className="h-6 w-6" strokeWidth={1.8} /><span className="absolute -end-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-gold text-[11px] font-black text-deep">{i}</span></span>
                <span><b className="block font-extrabold text-deep">{t(`how${i}`)}</b><span className="mt-0.5 block text-sm leading-6 text-gray-500">{t(`how${i}_d`)}</span></span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── The eight categories: orbit like the homepage's seven fields ── */}
      <section id="masarif" className="relative overflow-hidden bg-sand py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:gap-14 lg:grid-cols-[.9fr_1.1fr] lg:px-6">
          <div>
            <SectionHeading eyebrow={t("masarifEyebrow")} title={t("masarifTitle")} subtitle={t("masarifText")} />
            <blockquote className="mt-6 max-w-lg rounded-2xl border border-line bg-white px-5 py-4">
              <p lang="ar" dir="rtl" className="text-[17px] leading-9 text-deep">{AYAH_60}</p>
              <cite className="mt-1 block text-xs font-bold not-italic text-burgundy">{t("masarifRef")}</cite>
            </blockquote>
          </div>

          <ul className="relative mx-auto aspect-square w-full max-w-[370px] sm:max-w-[560px]">
            <li aria-hidden className="pointer-events-none absolute inset-0 rounded-full border border-deep/[0.07]" />
            <li aria-hidden className="pointer-events-none absolute inset-[14%] rounded-full border-[1.5px] border-dashed border-deep/15" />
            <li aria-hidden className="absolute inset-[34%] grid place-items-center overflow-hidden rounded-full bg-deep shadow-[0_30px_60px_-30px_rgba(18,35,57,.5)] sm:inset-[33%]">
              <div className="topo-layer text-white/10" />
              <div className="relative px-2 text-center">
                <b className="block text-4xl font-black leading-none text-gold sm:text-6xl" dir="ltr">8</b>
                <span className="text-[11px] font-bold leading-tight text-ice sm:text-sm">{t("masarifCore")}</span>
              </div>
            </li>
            {MASARIF.map(({ i, Icon }, idx) => {
              const a = ((-90 + (idx * 360) / 8) * Math.PI) / 180;
              const pos = { left: `${50 + 39.5 * Math.cos(a)}%`, top: `${50 + 39.5 * Math.sin(a)}%` } as React.CSSProperties;
              return (
                <li key={i} style={pos} className="group absolute w-[86px] -translate-x-1/2 -translate-y-1/2 text-center sm:w-[128px]">
                  <span className="absolute -top-1 end-3 grid h-5 w-5 place-items-center rounded-full bg-gold text-[10px] font-black text-deep sm:end-5 sm:h-6 sm:w-6 sm:text-xs">{i}</span>
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-line bg-white text-deep shadow-[0_14px_26px_-16px_rgba(18,35,57,.5)] transition-colors group-hover:bg-deep group-hover:text-gold sm:h-[72px] sm:w-[72px]">
                    <Icon className="h-5 w-5 sm:h-7 sm:w-7" strokeWidth={1.7} />
                  </span>
                  <b className="mt-1.5 block text-[12px] font-extrabold leading-tight text-deep sm:mt-2 sm:text-[15px]">{t(`m${i}`)}</b>
                  <small className="hidden text-xs font-semibold leading-snug text-gray-500 sm:block">{t(`ms${i}`)}</small>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── Trust ── */}
      <section className="relative overflow-hidden bg-deep py-14 text-white sm:py-16">
        <div className="topo-layer text-white/[0.05]" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-6">
          <SectionHeading tone="dark" eyebrow={t("trustEyebrow")} title={t("trustTitle")} />
          <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-6">
            {[[String(new Date().getFullYear() - 1961), t("stat1")], ["23", t("stat2")], ["7", t("stat3")]].map(([n, l]) => (
              <div key={l} className="border-t-2 border-white/15 pt-4"><b className="block text-xl font-black text-gold sm:text-4xl" dir="ltr" style={{ textAlign: "end" }}>{n}</b><span className="text-xs text-white/70 sm:text-sm">{l}</span></div>
            ))}
          </div>
          <p className="mt-8 flex items-center gap-2 text-sm text-white/70"><ShieldCheck className="h-4 w-4 text-gold" />{t("trustNote")}</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHeading eyebrow={t("faqEyebrow")} title={t("faqTitle")} align="center" />
          <div className="mt-8 grid items-start gap-3 lg:grid-cols-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <details key={i} className="group rounded-2xl border border-line bg-white px-5 transition-shadow open:shadow-[0_18px_40px_-30px_rgba(18,35,57,.5)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 font-extrabold text-deep">{t(`q${i}`)}<span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sand text-lg leading-none text-burgundy transition-transform group-open:rotate-45">+</span></summary>
                <p className="pb-4 leading-7 text-gray-600">{t(`a${i}`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Calculator ── */}
      <section id="calc" className="scroll-mt-28 border-t border-line bg-sand py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-6">
          <SectionHeading eyebrow={t("calcEyebrow")} title={t("calcHeading")} subtitle={t("calcIntro")} />

          <div className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()} autoComplete="off">
              {/* 1 — today's prices and the nisab standard */}
              <div className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
                {calcStep(1, t("calcStepPrices"))}
                <div className="grid grid-cols-2 gap-3">
                  {([["gp", t("f_goldPrice"), goldPrice, setGoldPrice, Coins], ["sp", t("f_silverPrice"), silverPrice, setSilverPrice, Gem]] as const).map(([id, label, value, onChange, Icon]) => (
                    <div key={id}>
                      <label htmlFor={`z-${id}`} className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold text-deep"><Icon className="h-4 w-4 text-gold" />{label}</label>
                      <div className="flex min-h-[50px] items-center gap-2 rounded-2xl border-[1.5px] border-line bg-offwhite px-3 focus-within:border-deep focus-within:bg-white">
                        <input id={`z-${id}`} inputMode="decimal" dir="ltr" placeholder={t("enterPrice")} value={value} onChange={(e) => onChange(e.target.value)} className="min-h-[48px] w-full min-w-0 flex-1 bg-transparent text-end text-base font-bold outline-none placeholder:text-sm placeholder:font-medium" />
                        <span className="text-sm text-gray-500">{symbol}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mb-2 mt-5 text-[13px] font-bold text-deep">{t("standard")}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(["gold85", "goldDiyanet", "silver"] as NisabStandard[]).map((st) => {
                    const on = standard === st;
                    const grams = NISAB_GRAMS[st];
                    const price = st === "silver" ? num(silverPrice) : num(goldPrice);
                    return (
                      <button key={st} type="button" aria-pressed={on} onClick={() => setStandard(st)}
                        className={`flex items-center justify-between gap-2 rounded-2xl border-[1.5px] px-3.5 py-2.5 text-start transition-colors sm:flex-col sm:items-start ${on ? "border-deep bg-deep text-white" : "border-line bg-white text-deep hover:border-deep/40"}`}>
                        <span className="text-sm font-extrabold">{t(`std_${st}`)}</span>
                        <span className={`text-xs font-bold ${on ? "text-gold" : "text-gray-500"}`} dir="ltr">{price ? money(grams * price) : "—"}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-gray-500">{prices.source !== "none" && prices.updatedAt ? t("pricesLive", { date: new Date(prices.updatedAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) }) : t("standardHint")}</p>
              </div>

              {/* 2 — what you own */}
              <div className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
                {calcStep(2, t("whatYouOwn"))}
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {ASSETS.map(({ key, Icon }) => {
                    const on = has(key);
                    return (
                      <button key={key} type="button" aria-pressed={on} onClick={() => setActive((p) => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n; })}
                        className={`flex h-[74px] flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] px-1 text-center transition-colors ${on ? "border-deep bg-deep text-white" : "border-line bg-offwhite text-deep hover:border-deep/40"}`}>
                        <Icon className={`h-5 w-5 ${on ? "text-gold" : "text-burgundy"}`} strokeWidth={1.8} />
                        <span className="text-[12px] font-extrabold leading-tight">{t(`asset_${key}`)}</span>
                      </button>
                    );
                  })}
                </div>
                {active.size > 0 && (
                  <div className="mt-5 grid gap-4 border-t border-dashed border-line pt-5 sm:grid-cols-2">
                    {has("cash") && field("cash", t("f_cash"), symbol)}
                    {has("gold") && (
                      <div>
                        <label htmlFor="z-gold" className="mb-1.5 block text-sm font-bold text-deep">{t("f_gold")}</label>
                        <div className="flex min-h-[50px] items-center gap-2 rounded-2xl border-[1.5px] border-line bg-offwhite px-3 focus-within:border-deep focus-within:bg-white">
                          <input id="z-gold" inputMode="decimal" dir="ltr" placeholder="0" value={v.gold ?? ""} onChange={set("gold")} className="min-h-[48px] w-full min-w-0 flex-1 bg-transparent text-end text-base outline-none" />
                          <span className="text-sm text-gray-500">{t("grams")}</span>
                          <select aria-label={t("karat")} value={karat} onChange={(e) => setKarat(e.target.value as Karat)} className="min-h-[40px] rounded-lg bg-white px-1 text-sm font-bold">
                            {(Object.keys(KARAT_PURITY) as Karat[]).map((k) => <option key={k} value={k}>{t("karatN", { n: k })}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                    {has("silver") && field("silver", t("f_silver"), t("grams"))}
                    {has("investments") && field("investments", t("f_investments"), symbol, t("h_investments"))}
                    {has("trade") && field("tradeStock", t("f_tradeStock"), symbol, t("h_tradeStock"))}
                    {has("trade") && field("tradeReceivables", t("f_tradeReceivables"), symbol)}
                    {has("owed") && field("owed", t("f_owed"), symbol)}
                  </div>
                )}
              </div>

              {/* 3 — debts */}
              <div className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
                {calcStep(3, t("calcStepDebts"))}
                {field("debts", t("f_debts"), symbol, t("h_debts"))}
              </div>
            </form>

            <aside aria-live="polite" className="relative overflow-hidden rounded-[28px] bg-deep p-6 text-white lg:sticky lg:top-28">
              <div className="topo-layer text-white/[0.06]" aria-hidden />
              <div className="relative">
                <p className="text-sm text-ice/80">{t("dueLabel")}</p>
                <p className={`mt-1 font-black leading-none ${result.reachesNisab ? "text-5xl text-gold" : "text-4xl text-white/85"}`} dir="ltr" style={{ textAlign: "end" }}>
                  {result.net > 0 && !result.reachesNisab ? t("belowNisab") : money(result.reachesNisab ? result.zakat : 0)}
                </p>
                <p className="mt-2 text-sm text-white/80">
                  {result.net <= 0 ? t("stateEmpty") : result.reachesNisab ? t("stateDue", { net: money(result.net) }) : t("stateBelow")}
                </p>
                <div className="mt-5">
                  <div className="mb-1.5 flex justify-between text-[11px] font-bold text-ice/70"><span>{t("rowNisab")}</span><span dir="ltr">{Math.round(result.progress * 100)}%</span></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-l from-gold to-gold/70 transition-all" style={{ width: `${Math.round(result.progress * 100)}%` }} /></div>
                </div>
                <dl className="mt-5 space-y-2.5 rounded-2xl bg-white/[0.06] p-4 text-sm">
                  <div className="flex justify-between"><dt className="text-white/75">{t("rowAssets")}</dt><dd className="font-bold">{money(result.assets)}</dd></div>
                  <div className="flex justify-between"><dt className="text-white/75">{t("rowDebts")}</dt><dd className="font-bold">{isolateLtr(`−${symbol}${formatNumber(Math.round(result.debts))}`)}</dd></div>
                  <div className="flex justify-between border-t border-white/10 pt-2.5"><dt className="text-white/75">{t("rowNet")}</dt><dd className="font-extrabold">{money(result.net)}</dd></div>
                  <div className="flex justify-between"><dt className="text-white/75">{t("rowNisab")}</dt><dd className="font-bold">{result.nisab ? money(result.nisab) : "—"}</dd></div>
                </dl>
                <button type="button" disabled={!result.reachesNisab} onClick={applyCalculated}
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gold font-extrabold text-deep transition-transform hover:-translate-y-0.5 disabled:bg-white/10 disabled:text-white/50 disabled:hover:translate-y-0">
                  <Heart className="h-5 w-5" />{result.reachesNisab ? t("useAmount", { amount: money(result.zakat) }) : t("calcPending")}
                </button>
                <p className="mt-3 text-xs leading-5 text-white/60">{t("disclaimer")}</p>
              </div>
            </aside>
          </div>

          <div id="contact" className="mt-8 flex flex-col gap-4 rounded-[24px] bg-white p-5 sm:flex-row sm:items-center sm:px-7">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-burgundy/10 text-burgundy"><MessageCircle className="h-6 w-6" /></span>
            <p className="flex-1"><b className="block text-deep">{t("askTitle")}</b><span className="text-sm text-gray-500">{t("askText")}</span></p>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-3 rounded-full bg-deep px-6 font-extrabold text-white hover:bg-deep/90">
              {t("askCta")}<span dir="ltr" className="hidden text-sm font-bold text-gold sm:inline">+90 530 651 65 49</span>
            </a>
          </div>
        </div>
      </section>


      {dialogOpen && !chosen && payCategory && (
        <DonationDialog isOpen onClose={() => setDialogOpen(false)} categoryId={payCategory.id} categoryName={`${t("navLabel")} — ${t(`dest_${dest}`)}`} categoryImage={payCategory.image ?? undefined} initialDonationAmount={payAmount} />
      )}
      {dialogOpen && chosen && (
        <DonationDialog
          isOpen
          onClose={() => setDialogOpen(false)}
          campaignId={chosen.id}
          campaignTitle={chosen.title}
          campaignImage={chosen.images?.[0]}
          targetAmount={chosen.targetAmount}
          amountRaised={chosen.currentAmount}
          fundraisingMode={chosen.fundraisingMode}
          goalType={chosen.goalType}
          sharePriceUSD={chosen.sharePriceUSD ?? null}
          suggestedShareCounts={chosen.suggestedShareCounts ?? null}
          shareLabels={chosen.shareLabels ?? null}
          suggestedDonations={chosen.suggestedDonations ?? null}
          suggestedTeamSupport={chosen.suggestedTeamSupport ?? null}
          initialDonationAmount={payAmount}
        />
      )}
    </main>
  );
}
