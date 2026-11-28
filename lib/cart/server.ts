/**
 * Cart lines are either a project (campaignId) or a category (categoryId, e.g. zakat for a
 * country through the country's category). Typed narrowly so this compiles before
 * `prisma generate` has seen the optional categoryId / label fields.
 */
import { prisma } from "@/lib/prisma";

type Row = Record<string, unknown> & { id: string; userId: string };
type Delegate = {
  findMany(args?: unknown): Promise<Row[]>;
  findUnique(args: unknown): Promise<Row | null>;
  create(args: unknown): Promise<Row>;
  delete(args: unknown): Promise<Row>;
};
export const cartDb = (prisma as unknown as { cartItem: Delegate }).cartItem;

export const CART_INCLUDE = {
  campaign: {
    select: { id: true, title: true, images: true, shareLabels: true, translations: { select: { locale: true, title: true } } },
  },
  category: {
    select: { id: true, name: true, image: true, icon: true, translations: { select: { locale: true, name: true } } },
  },
} as const;

export { parseCartLine, type CartLineInput } from "./parse";
