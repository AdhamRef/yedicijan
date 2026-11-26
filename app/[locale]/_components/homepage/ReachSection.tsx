"use client";

import React from "react";
import { useTranslations } from "next-intl";
import BrandDots from "@/components/brand/BrandDots";

const REGIONS = [
  ["rMiddleEast", "cMiddleEast"],
  ["rAfrica", "cAfrica"],
  ["rAsia", "cAsia"],
  ["rBalkans", "cBalkans"],
] as const;

/** The 23 countries from the brand guide's Instagram highlights, grouped by region. */
export default function ReachSection() {
  const t = useTranslations("HomeRedesign");
  return (
    <section className="relative isolate overflow-hidden bg-deep py-16 text-white sm:py-24">
      <div className="topo-layer -z-10 text-white/[0.09]" aria-hidden />
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 sm:gap-12 lg:grid-cols-[.8fr_1.2fr] lg:px-6">
        <div>
          <span className="inline-flex items-center gap-2.5 text-[13px] font-bold text-gold">
            <BrandDots />
            {t("reachEyebrow")}
          </span>
          <h2 className="mt-3 flex items-end gap-3">
            <span className="text-[80px] font-black leading-none text-gold sm:text-[120px]" dir="ltr">23</span>
            <span className="pb-2 text-2xl font-extrabold sm:pb-3">{t("countries")}</span>
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-7 text-ice/80 sm:text-base sm:leading-8">{t("reachText")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {REGIONS.map(([r, c]) => {
            const list = t(c).split(/[،,]/).map((x) => x.trim()).filter(Boolean);
            return (
              <div key={r} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 sm:p-5">
                <h3 className="flex items-center justify-between text-sm font-extrabold text-gold">
                  {t(r)}
                  <span className="text-ice/60" dir="ltr">{list.length}</span>
                </h3>
                <ul className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1 text-sm font-semibold text-white/90 sm:mt-3 sm:gap-x-4 sm:gap-y-1.5 sm:text-[15px]">
                  {list.map((n) => (
                    <li key={n} className="inline-flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-burgundy" />
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
