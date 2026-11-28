"use client";

import React from "react";
import { useTranslations } from "next-intl";
import SectionHeading from "@/components/brand/SectionHeading";
import { cld, cldSrcSet } from "@/lib/cloudinary-url";

/**
 * Transparency: the path a gift takes, next to a torn-edge photo board of
 * delivered work (campaign photos from the dashboard).
 */
export default function HowItWorks({ images }: { images: string[] }) {
  const t = useTranslations("HomeRedesign");
  const [a, b] = images;
  const steps = [1, 2, 3, 4] as const;
  return (
    <section id="field" className="bg-offwhite py-16 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:gap-14 lg:grid-cols-2 lg:px-6">
        <div className="relative order-2 h-[280px] sm:h-[500px] lg:order-none" aria-hidden>
          {a && (
            <div className="torn-edge-soft absolute inset-0 bottom-14 end-10 -rotate-2 overflow-hidden rounded-md bg-sand shadow-[0_30px_60px_-30px_rgba(18,35,57,.45)] sm:bottom-28 sm:end-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cld(a, 900)} srcSet={cldSrcSet(a, [480, 700, 900, 1200])} sizes="(max-width: 1024px) 85vw, 560px" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            </div>
          )}
          {b && (
            <div className="torn-edge absolute bottom-0 end-0 h-32 w-40 rotate-3 overflow-hidden rounded-md border-8 border-white bg-sand shadow-[0_30px_60px_-30px_rgba(18,35,57,.45)] sm:h-56 sm:w-72">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cld(b, 600)} srcSet={cldSrcSet(b, [320, 600])} sizes="(max-width: 640px) 160px, 288px" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            </div>
          )}
          <span className="absolute start-4 top-5 -rotate-6 rounded-2xl bg-burgundy px-4 py-2.5 text-sm font-extrabold text-white shadow-lg">
            {t("stamp")}
          </span>
        </div>

        <div>
          <SectionHeading eyebrow={t("howEyebrow")} title={t("howTitle")} mark={t("howMark")} subtitle={t("howSubtitle")} />
          <ol className="mt-7 grid gap-3 sm:mt-8 sm:gap-3.5">
            {steps.map((n) => (
              <li key={n} className="grid grid-cols-[44px_1fr] items-start gap-3.5 rounded-2xl border border-line bg-white p-3.5 sm:grid-cols-[52px_1fr] sm:gap-4 sm:px-5 sm:py-4">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-deep text-lg font-black text-gold sm:h-[52px] sm:w-[52px] sm:rounded-2xl sm:text-xl" dir="ltr">
                  {n}
                </span>
                <div>
                  <b className="text-[15px] font-extrabold text-deep sm:text-base">{t(`how${n}Title`)}</b>
                  <p className="mt-0.5 text-[13px] leading-6 text-gray-500 sm:text-sm">{t(`how${n}Desc`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
