/** Validation of a cart line coming from the browser (pure; no database). */
const OBJECT_ID = /^[a-f\d]{24}$/i;

export type CartLineInput = {
  campaignId?: string;
  categoryId?: string;
  amount: number;
  amountUSD: number;
  currency: string;
  shareCount?: number;
  label?: string;
};

/** Validates a line from the browser. Returns an error message or the clean line. */
export function parseCartLine(body: unknown): { error: string } | { line: CartLineInput } {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const campaignId = typeof b.campaignId === "string" && OBJECT_ID.test(b.campaignId) ? b.campaignId : undefined;
  const categoryId = typeof b.categoryId === "string" && OBJECT_ID.test(b.categoryId) ? b.categoryId : undefined;
  if (!campaignId === !categoryId) return { error: "A cart line needs exactly one of campaignId or categoryId" };
  const amount = Number(b.amount);
  const amountUSD = Number(b.amountUSD);
  const currency = typeof b.currency === "string" ? b.currency.trim().toUpperCase().slice(0, 5) : "";
  if (!(amount > 0) || !(amountUSD > 0) || !currency) return { error: "Valid amount, amountUSD and currency are required" };
  const sc = Number(b.shareCount);
  const label = typeof b.label === "string" ? b.label.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 140) : "";
  return {
    line: {
      ...(campaignId ? { campaignId } : { categoryId }),
      amount,
      amountUSD,
      currency,
      ...(sc > 0 ? { shareCount: Math.floor(sc) } : {}),
      ...(label ? { label } : {}),
    },
  };
}
