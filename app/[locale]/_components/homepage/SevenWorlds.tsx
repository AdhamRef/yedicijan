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
 * Phones get the same orbit, scaled down.
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

        {/* The orbit on every screen; phones get smaller rings, icons and labels. */}
        <ul className="relative mx-auto aspect-square w-full max-w-[370px] sm:max-w-[560px]">
          <li aria-hidden className="pointer-events-none absolute inset-0 rounded-full border border-deep/[0.07]" />
          <li aria-hidden className="pointer-events-none absolute inset-[14%] rounded-full border-[1.5px] border-dashed border-deep/15" />
          <li aria-hidden className="absolute inset-[34%] grid place-items-center overflow-hidden rounded-full bg-deep shadow-[0_30px_60px_-30px_rgba(18,35,57,.5)] sm:inset-[33%]">
            <div className="topo-layer text-white/10" />
            <div className="relative px-2 text-center">
              <b className="block text-4xl font-black leading-none text-gold sm:text-6xl" dir="ltr">7</b>
              <span className="text-[11px] font-bold leading-tight text-ice sm:text-sm">{t("worldsCore")}</span>
            </div>
          </li>
          {WORLDS.map(({ Icon, k }, i) => {
            const a = ((-90 + (i * 360) / 7) * Math.PI) / 180;
            const pos = { left: `${50 + 40 * Math.cos(a)}%`, top: `${50 + 40 * Math.sin(a)}%` } as React.CSSProperties;
            return (
              <li key={k} style={pos} className="absolute w-[92px] -translate-x-1/2 -translate-y-1/2 text-center sm:w-[132px]">
                <Link href="/campaigns" className="group block">
                  <span className="absolute -top-1 end-3 grid h-5 w-5 place-items-center rounded-full bg-gold text-[10px] font-black text-deep sm:end-5 sm:h-6 sm:w-6 sm:text-xs">
                    {i + 1}
                  </span>
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-line bg-white text-deep shadow-[0_14px_26px_-16px_rgba(18,35,57,.5)] transition-colors group-hover:bg-burgundy group-hover:text-white sm:h-[76px] sm:w-[76px]">
                    <Icon className="h-5 w-5 sm:h-7 sm:w-7" strokeWidth={1.7} />
                  </span>
                  <b className="mt-1.5 block text-[12px] font-extrabold leading-tight text-deep sm:mt-2 sm:text-[15px]">{t(`${k}`)}</b>
                  <small className="hidden truncate text-xs font-semibold text-gray-500 sm:block">{t(`${k}s`)}</small>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
