/**
 * A cart line is a project (campaign) or a category (zakat for a country). These helpers give
 * the title, image and payload for either, so the cart sheet and checkout treat both alike.
 */
import type { ShareLabelsConfig } from "@/lib/campaign/share-labels";

export type CartLineView = {
  id: string;
  amount: number;
  amountUSD?: number | null;
  currency?: string;
  shareCount?: number | null;
  label?: string | null;
  campaignId?: string | null;
  categoryId?: string | null;
  campaign?: {
    id: string;
    title: string;
    images?: string[];
    shareLabels?: ShareLabelsConfig | null;
    translations?: { locale: string; title: string }[];
  } | null;
  category?: {
    id: string;
    name: string;
    image?: string | null;
    translations?: { locale: string; name: string }[];
  } | null;
};

export function lineTitle(item: CartLineView, locale: string): string {
  if (item.label) return item.label;
  if (item.campaign) return item.campaign.translations?.find((tr) => tr.locale === locale)?.title ?? item.campaign.title;
  if (item.category) return item.category.translations?.find((tr) => tr.locale === locale)?.name ?? item.category.name;
  return "";
}

export function lineImage(item: CartLineView): string | null {
  return item.campaign?.images?.[0] || item.category?.image || null;
}

/** The target id for tracking (project or category). */
export function lineTargetId(item: CartLineView): string | null {
  return item.campaign?.id ?? item.campaignId ?? item.category?.id ?? item.categoryId ?? null;
}

/** What the checkout sends for this line. */
export function linePayload(item: CartLineView, amountUSD: number) {
  const categoryId = item.category?.id ?? item.categoryId ?? null;
  const campaignId = item.campaign?.id ?? item.campaignId ?? null;
  return {
    ...(campaignId ? { campaignId } : { categoryId }),
    amount: item.amount,
    amountUSD,
    ...(campaignId && item.shareCount != null && item.shareCount > 0 ? { shareCount: item.shareCount } : {}),
    ...(item.label ? { label: item.label } : {}),
  };
}
