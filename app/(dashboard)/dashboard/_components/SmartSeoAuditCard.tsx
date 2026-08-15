"use client";

import { SmartSeoWorkbenchCard } from "./SmartSeoWorkbenchCard";

type SeoContentType = "campaign" | "category" | "blog";
type LocaleCode = "ar" | "en" | "fr" | "tr" | "id" | "pt" | "es" | "de";

export function SmartSeoAuditCard({
  type,
  locale = "ar",
  title,
  description,
  slug,
  imageCount = 0,
}: {
  type: SeoContentType;
  locale?: LocaleCode;
  title?: string | null;
  description?: string | null;
  slug?: string | null;
  imageCount?: number;
}) {
  return (
    <SmartSeoWorkbenchCard
      type={type}
      locale={locale}
      title={title}
      description={description}
      slug={slug}
      imageCount={imageCount}
    />
  );
}
