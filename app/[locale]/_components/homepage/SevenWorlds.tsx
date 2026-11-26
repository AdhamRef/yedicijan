"use client";

import React from "react";
import { Droplet, GraduationCap, Home, Moon, Package, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import SectionHeading from "@/components/brand/SectionHeading";
import MosqueIcon from "./MosqueIcon";

const WORLDS = [
  { Icon: Package, k: "w1" },
  { Icon: Droplet, k: "w2" },
  { Icon: MosqueIcon, k: "w3" },
  { Icon: Home, k: "w4" },
  { Icon: GraduationCap, k: "w5" },
  { Icon: Users, k: "w6" },
  { Icon: Moon, k: "w7" },
] as const;

/**
 * "Yedi Cihan" means "the seven worlds". The seven areas the association works
 * in sit on an orbit around a "7" core — the identity element of the homepage.
 * On phones the orbit becomes a two-column grid.
 */
export default function SevenWorlds() {
  const t = useTranslations("HomeRedesign");
  return (
    <section id="worlds" className="relative overflow-hidden bg-offwhite py-16 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:gap-14 lg:grid-cols-[.9fr_1.1fr] lg:px-6">
        <div>
          <SectionHeading eyebrow={t("worldsEyebrow")} title={t("worldsTitle")} mark={t("worldsMark")} markOnNewLine subtitle={t("worldsText")} />
          <div className="mt-6 flex max-w-lg items-center gap-4 rounded-2xl border border-line bg-white px-4 py-3.5 sm:mt-7 sm:px-5 sm:py-4">
            <span className="whitespace-nowrap font-poppins text-lg sm:text-[22px] font-extrabold text-deep" dir="ltr">
              <span className="text-burgundy">Yedi</span> Cihan
            </span>
            <p className="text-[13px] leading-6 text-gray-500 sm:text-sm">{t("nameMeaning")}</p>
          </div>
        </div>

        <ul className="relative grid grid-cols-2 gap-2.5 sm:mx-auto sm:block sm:aspect-square sm:w-full sm:max-w-[560px]">
          <li aria-hidden className="pointer-events-none absolute inset-0 hidden rounded-full border border-deep/[0.07] sm:block" />
          <li aria-hidden className="pointer-events-none absolute inset-[14%] hidden rounded-full border-[1.5px] border-dashed border-deep/15 sm:block" />
          <li aria-hidden className="absolute inset-[33%] hidden place-items-center overflow-hidden rounded-full bg-deep shadow-[0_30px_60px_-30px_rgba(18,35,57,.5)] sm:grid">
            <div className="topo-layer text-white/10" />
            <div className="relative text-center">
              <b className="block text-6xl font-black leading-none text-gold" dir="ltr">7</b>
              <span className="text-sm font-bold text-ice">{t("worldsCore")}</span>
            </div>
          </li>
          {WORLDS.map(({ Icon, k }, i) => {
            const a = ((-90 + (i * 360) / 7) * Math.PI) / 180;
            // Orbit coordinates only apply from `sm`; on phones the items flow in a grid.
            const pos = { "--x": `${50 + 43 * Math.cos(a)}%`, "--y": `${50 + 43 * Math.sin(a)}%` } as React.CSSProperties;
            return (
              <li
                key={k}
                style={pos}
                className={`relative rounded-2xl border border-line bg-white px-3 py-3 sm:absolute ${i === 6 ? "col-span-2" : ""} sm:left-[var(--x)] sm:top-[var(--y)] sm:w-[132px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:border-0 sm:bg-transparent sm:p-0 sm:text-center`}
              >
                <Link href="/campaigns" className="group flex items-center gap-3 sm:block">
                  <span className="absolute end-2 top-2 hidden h-6 w-6 place-items-center rounded-full bg-gold text-xs font-black text-deep sm:end-5 sm:-top-1 sm:grid">
                    {i + 1}
                  </span>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-deep text-gold transition-colors group-hover:bg-burgundy group-hover:text-white sm:mx-auto sm:h-[76px] sm:w-[76px] sm:border sm:border-line sm:bg-white sm:text-deep sm:shadow-[0_16px_30px_-18px_rgba(18,35,57,.45)]">
                    <Icon className="h-5 w-5 sm:h-7 sm:w-7" strokeWidth={1.7} />
                  </span>
                  <span className="min-w-0">
                    <b className="block text-sm font-extrabold leading-snug text-deep sm:mt-2 sm:text-[15px]">{t(`${k}`)}</b>
                    <small className="block truncate text-[11.5px] font-semibold text-gray-500 sm:text-xs">{t(`${k}s`)}</small>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
