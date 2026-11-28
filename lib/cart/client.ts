"use client";
/**
 * Adding to the cart from anywhere (project cards, waqf funds, zakat countries): guests keep
 * the line in the browser, signed-in donors on the server. Fires the events the navbar and the
 * floating cart button listen to, so the cart icon lights up without reloading the page.
 */
import axios from "axios";
import { useCart } from "@/hooks/useCart";
import type { CartLineView } from "./line";

export const CART_CHANGED_EVENT = "cart-reminder:changed";
export const CART_ADDED_EVENT = "cart:added";

export type NewCartLine = {
  campaign?: { id: string; title: string; image?: string | null };
  category?: { id: string; name: string; image?: string | null };
  amount: number;
  amountUSD: number;
  currency: string;
  shareCount?: number;
  label?: string;
};

export async function addLineToCart(line: NewCartLine, signedIn: boolean): Promise<CartLineView> {
  let saved: CartLineView;
  if (signedIn) {
    const res = await axios.post("/api/cart", {
      ...(line.campaign ? { campaignId: line.campaign.id } : { categoryId: line.category!.id }),
      amount: line.amount,
      amountUSD: line.amountUSD,
      currency: line.currency,
      ...(line.shareCount ? { shareCount: line.shareCount } : {}),
      ...(line.label ? { label: line.label } : {}),
    });
    saved = res.data;
  } else {
    saved = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      amount: line.amount,
      amountUSD: line.amountUSD,
      currency: line.currency,
      shareCount: line.shareCount ?? null,
      label: line.label ?? null,
      ...(line.campaign
        ? { campaignId: line.campaign.id, campaign: { id: line.campaign.id, title: line.campaign.title, images: line.campaign.image ? [line.campaign.image] : [] } }
        : { categoryId: line.category!.id, category: { id: line.category!.id, name: line.category!.name, image: line.category!.image ?? null } }),
    };
    useCart.getState().addItem(saved);
  }
  window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT));
  window.dispatchEvent(new CustomEvent(CART_ADDED_EVENT));
  return saved;
}
