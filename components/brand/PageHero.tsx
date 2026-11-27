import React from "react";
import { Link } from "@/i18n/routing";
import SectionHeading from "./SectionHeading";

interface Crumb {
  href?: string;
  label: string;
}

interface PageHeroProps {
  eyebrow?: string;
  title: React.ReactNode;
  mark?: string;
  subtitle?: React.ReactNode;
  crumbs?: Crumb[];
  /** Optional right-hand (end) slot: an image, a card, stats… */
  aside?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  /** Full-bleed photo version (homepage style): dark wash, contour overlay, white type. */
  image?: string | null;
}

/**
 * Shared header for every inner page: warm paper background with the contour
 * pattern, breadcrumb, and a branded heading. Keeps inner pages visually tied
 * to the homepage without each one re-inventing a banner.
 */
export default function PageHero({ eyebrow, title, mark, subtitle, crumbs, aside, children, className = "", image }: PageHeroProps) {
  if (image) {
    return (
      <section className={`relative isolate overflow-hidden bg-deep text-white ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- admin uploads can live on any host */}
        <img src={image} alt="" aria-hidden fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover object-[50%_35%]" />
        {/* Phones: the text runs the full width, so the wash is even (top lighter, so the photo
            still reads) instead of the side gradient that left half the text on a bright photo. */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-deep/25 via-deep/55 to-deep md:hidden" aria-hidden />
        <div className="absolute inset-0 -z-10 hidden bg-gradient-to-l from-deep via-deep/80 to-deep/30 rtl:bg-gradient-to-r md:block" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 -z-10 hidden h-32 bg-gradient-to-t from-deep/80 to-transparent md:block" aria-hidden />
        <div className="topo-layer -z-10 text-white/[0.08]" aria-hidden />
        <div className="mx-auto flex min-h-[270px] max-w-7xl flex-col px-5 pb-14 pt-4 sm:block sm:min-h-0 sm:pb-28 sm:pt-14 lg:px-6 lg:pb-32 lg:pt-16">
          {crumbs && crumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="mb-5 text-[13px] font-semibold text-ice/80 sm:mb-8">
              <ol className="flex flex-wrap items-center gap-2">
                {crumbs.map((c, i) => (
                  <li key={i} className="inline-flex items-center gap-2">
                    {i > 0 && <span className="text-white/30">/</span>}
                    {c.href ? (
                      <Link href={c.href} className="hover:text-white">
                        {c.label}
                      </Link>
                    ) : (
                      <span className="text-white">{c.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div className={`mt-auto grid items-end gap-10 ${aside ? "lg:grid-cols-[1.2fr_.8fr]" : ""}`}>
            <div className="max-w-2xl [text-wrap:pretty] max-md:[text-shadow:0_2px_14px_rgba(18,35,57,.55)]">
              <SectionHeading as="h1" tone="dark" eyebrow={eyebrow} title={title} mark={mark} subtitle={subtitle} />
              {children}
            </div>
            {aside && <div className="lg:justify-self-end">{aside}</div>}
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className={`relative isolate overflow-hidden border-b border-line bg-offwhite ${className}`}>
      <div className="topo-layer -z-10 text-deep/[0.07]" aria-hidden />
      <div className="mx-auto max-w-7xl px-5 py-10 sm:py-14 lg:px-6 lg:py-16">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-6 text-[13px] font-semibold text-gray-500">
            <ol className="flex flex-wrap items-center gap-2">
              {crumbs.map((c, i) => (
                <li key={i} className="inline-flex items-center gap-2">
                  {i > 0 && <span className="text-gray-300">/</span>}
                  {c.href ? (
                    <Link href={c.href} className="hover:text-burgundy">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-deep">{c.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className={`grid items-center gap-10 ${aside ? "lg:grid-cols-[1.1fr_.9fr]" : ""}`}>
          <div>
            <SectionHeading as="h1" eyebrow={eyebrow} title={title} mark={mark} subtitle={subtitle} />
            {children}
          </div>
          {aside && <div>{aside}</div>}
        </div>
      </div>
    </section>
  );
}
