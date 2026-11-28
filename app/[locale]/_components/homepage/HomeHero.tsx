"use client";

import YCMark from "@/components/brand/YCMark";
import React, { useEffect, useState } from "react";
import { preload } from "react-dom";
import { ArrowLeft, Heart, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import BrandDots from "@/components/brand/BrandDots";
import { cld, cldSrcSet } from "@/lib/cloudinary-url";
import type { SlideItem } from "./HeroSlider";

/** Widths the hero photo is offered in; a phone takes the 640 one instead of 1200. */
const HERO_WIDTHS = [480, 640, 900, 1200];
const HERO_SIZES = "(max-width: 640px) 92vw, (max-width: 1024px) 560px, 560px";
const heroSrcSet = (src: string) => cldSrcSet(src, HERO_WIDTHS);

interface HomeHeroProps {
  slides: SlideItem[];
  /** Fallback photos when the dashboard has fewer than two slides. */
  fallbackImages: string[];
}

/**
 * Brand-guide hero: copy on warm paper with the contour pattern, and a photo
 * collage on the other side — an arched main photo (dashboard slides cross-fade
 * inside it), a torn-edge second photo as on the brand's social posts, and the
 * yellow "YEDİCİHAN · SINCE 1961" seal with the YC monogram.
 */
export default function HomeHero({ slides, fallbackImages }: HomeHeroProps) {
  const t = useTranslations("HomeRedesign");
  const tB = useTranslations("Brand");

  const images = [...slides.map((s) => s.image).filter((x): x is string => Boolean(x)), ...fallbackImages].filter(
    (v, i, arr) => arr.indexOf(v) === i
  );
  const main = images.length > 1 ? images.slice(0, Math.max(1, images.length - 1)) : images;
  const second = images.length > 1 ? images[images.length - 1] : null;

  // The first photo is the page's largest paint: ask for it in the document head, at the right
  // size, before the stylesheet and scripts are done.
  if (main[0]) {
    preload(cld(main[0], 1200), { as: "image", fetchPriority: "high", imageSrcSet: heroSrcSet(main[0]), imageSizes: HERO_SIZES });
  }

  // The other photos are mounted, and the cross-fade starts, only after the visitor's first
  // scroll / touch / click / key. Before that the first photo stays alone: a later slide fading
  // in during load became the page's "largest paint" at 6 s (PageSpeed LCP 5.7 s, or no LCP at
  // all), and phones downloaded three photos nobody had seen yet.
  const [current, setCurrent] = useState(0);
  const [rotating, setRotating] = useState(false);
  useEffect(() => {
    if (main.length <= 1) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const events = ["scroll", "pointerdown", "keydown", "touchstart"] as const;
    const start = () => {
      events.forEach((e) => window.removeEventListener(e, start));
      setRotating(true);
    };
    events.forEach((e) => window.addEventListener(e, start, { passive: true, once: true }));
    return () => events.forEach((e) => window.removeEventListener(e, start));
  }, [main.length]);
  useEffect(() => {
    if (!rotating) return;
    const id = setInterval(() => setCurrent((c) => (c + 1) % main.length), 6000);
    return () => clearInterval(id);
  }, [rotating, main.length]);

  const facts = [
    { value: String(new Date().getFullYear() - 1961), label: t("fact1") },
    { value: "23", label: t("fact2") },
    { value: "7", label: t("fact3") },
  ];

  return (
    <section className="relative isolate overflow-hidden bg-offwhite pb-28 pt-7 sm:pt-14 lg:pb-36">
      <div className="topo-layer -z-10 text-deep/[0.08]" aria-hidden />
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 sm:gap-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,.98fr)] lg:gap-14 lg:px-6">
        {/* ── Copy ── */}
        <div>
          <span className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-line bg-white py-1.5 pe-3 ps-1.5 text-[11.5px] font-bold leading-5 text-deep shadow-[0_8px_24px_-16px_rgba(18,35,57,.4)] sm:gap-2.5 sm:rounded-full sm:pe-4 sm:ps-2 sm:text-[13px]">
            <span className="shrink-0 rounded-full bg-deep px-2.5 py-0.5 text-xs font-extrabold text-gold" dir="ltr">1961</span>
            <span className="line-clamp-1 sm:line-clamp-none">
            {t("badge")}</span>
          </span>

          <h1 className="mt-5 text-[34px] font-black leading-[1.2] sm:mt-6 sm:leading-[1.15] tracking-tight text-deep sm:text-5xl lg:text-[62px]">
            {t("titleTop")}
            <br />
            {/* Line two may wrap in long languages (fr, de, id); the highlighted words stay together. */}
            <span>
              {t("titleTo") ? `${t("titleTo")} ` : ""}
              <span className="brand-mark">{t("titleMark")}</span>
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-7 text-gray-600 sm:mt-6 sm:text-lg sm:leading-8">{t("subtitle")}</p>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:mt-8 sm:flex sm:flex-wrap">
            <a
              href="#give"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-burgundy px-5 sm:px-7 text-base font-bold text-white shadow-[0_14px_30px_-14px_rgba(166,36,60,.7)] transition-colors hover:bg-burgundyDark"
            >
              <Heart className="h-5 w-5" />
              {tB("donateNow")}
            </a>
            <Link
              href="/campaigns"
              className="inline-flex h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-full border-[1.5px] border-deep/20 px-4 text-[15px] sm:px-7 sm:text-base text-base font-bold text-deep transition-colors hover:border-deep"
            >
              {t("browse")}
              <ArrowLeft className="hidden h-4 w-4 ltr:rotate-180 sm:block" />
            </Link>
          </div>

          <dl className="mt-8 grid max-w-xl grid-cols-3 border-t border-line pt-5 sm:mt-10 sm:pt-6">
            {facts.map((f, i) => (
              <div key={f.label} className={i > 0 ? "border-s border-line ps-3 sm:ps-5" : "pe-3"}>
                <dt className="sr-only">{f.label}</dt>
                <dd className="text-[28px] font-black leading-none text-deep sm:text-[34px]">{f.value}</dd>
                <dd className="mt-1.5 text-xs font-semibold leading-5 text-gray-500 sm:text-[13px]">{f.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ── Collage ── */}
        <div className="relative mx-auto h-[300px] w-full max-w-[560px] sm:h-[520px] lg:h-[590px]" aria-hidden>
          <div className="absolute inset-0 overflow-hidden rounded-[28px] bg-sand shadow-[0_30px_60px_-30px_rgba(18,35,57,.45)] sm:bottom-16 sm:start-0 sm:end-14 sm:rounded-b-[28px] sm:rounded-t-[200px] lg:rounded-t-[240px]">
            {(rotating ? main : main.slice(0, 1)).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={cld(src, 1200)}
                srcSet={heroSrcSet(src)}
                sizes={HERO_SIZES}
                alt=""
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                decoding={i === 0 ? "sync" : "async"}
                className={`absolute inset-0 h-full w-full object-cover ${i === current ? "opacity-100" : "opacity-0"} ${current > 0 || i > 0 ? "transition-opacity duration-1000" : ""}`}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-deep/60 via-transparent to-transparent" />
            <div className="absolute bottom-5 start-5 max-w-[230px] text-white sm:bottom-8 sm:start-8 sm:max-w-[250px]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-0.5 text-xs font-bold backdrop-blur">
                <MapPin className="h-3.5 w-3.5" />
                {t("photoTag")}
              </span>
              <p className="mt-2 text-base font-extrabold leading-snug sm:text-xl">{t("photoCaption")}</p>
            </div>
          </div>

          {second && (
            <div className="torn-edge absolute bottom-0 end-0 hidden h-40 w-36 overflow-hidden sm:block rounded-[22px] border-[7px] border-offwhite bg-sand shadow-[0_30px_60px_-30px_rgba(18,35,57,.45)] sm:h-[250px] sm:w-[230px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cld(second, 600)} alt="" loading="lazy" className="h-full w-full object-cover" />
            </div>
          )}

          {/* Seal: rotating brand line around the YC monogram */}
          <div className="absolute -top-5 end-3 grid h-20 w-20 -rotate-6 place-items-center rounded-full bg-gold sm:-top-6 sm:end-0 sm:h-36 sm:w-36 shadow-[0_30px_60px_-30px_rgba(18,35,57,.45)] sm:-top-6 sm:h-36 sm:w-36">
            {/* The ring turns on an HTML wrapper, and the SVG is laid out left-to-right: Safari did not
                animate the spinning <svg> itself on the right-to-left (Arabic) page. */}
            <div className="brand-spin absolute inset-0" aria-hidden>
            <svg viewBox="0 0 150 150" direction="ltr" style={{ direction: "ltr" }} className="h-full w-full">
              <defs>
                <path id="hero-seal-path" d="M75 75m-58 0a58 58 0 1 1 116 0a58 58 0 1 1-116 0" />
              </defs>
              <text className="fill-deep text-[10.5px] font-extrabold tracking-[2.2px]">
                <textPath href="#hero-seal-path">YEDİCİHAN · SINCE 1961 · YEDİCİHAN · SINCE 1961 ·</textPath>
              </text>
            </svg>
            </div>
            <YCMark className="relative h-auto w-9 text-deep sm:w-16" />
          </div>

          <span className="absolute -start-6 top-28 hidden text-burgundy sm:block">
            <BrandDots />
          </span>

        </div>
      </div>
    </section>
  );
}
