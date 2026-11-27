import "server-only";

/**
 * Gold and silver price per gram in USD for the zakat calculator.
 *
 * Read from gold-api.com (public, no key) and cached for six hours. If it fails, the
 * configured ZAKAT_GOLD_USD_PER_GRAM / ZAKAT_SILVER_USD_PER_GRAM are used, and failing
 * those the page lets the donor type today's price — it never invents one silently.
 */
const TROY_OUNCE_GRAMS = 31.1034768;

export type MetalPriceQuote = {
  goldPerGramUSD: number | null;
  silverPerGramUSD: number | null;
  updatedAt: string | null;
  source: "live" | "configured" | "none";
};

async function fetchOunce(symbol: "XAU" | "XAG"): Promise<{ price: number; updatedAt: string | null } | null> {
  try {
    const res = await fetch(`https://api.gold-api.com/price/${symbol}`, {
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { price?: unknown; updatedAt?: unknown };
    const price = Number(data.price);
    if (!Number.isFinite(price) || price <= 0) return null;
    return { price, updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null };
  } catch {
    return null;
  }
}

const envNumber = (v: string | undefined) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : null;
};

export async function getMetalPrices(): Promise<MetalPriceQuote> {
  const [xau, xag] = await Promise.all([fetchOunce("XAU"), fetchOunce("XAG")]);
  if (xau && xag) {
    return {
      goldPerGramUSD: xau.price / TROY_OUNCE_GRAMS,
      silverPerGramUSD: xag.price / TROY_OUNCE_GRAMS,
      updatedAt: xau.updatedAt ?? new Date().toISOString(),
      source: "live",
    };
  }
  const gold = envNumber(process.env.ZAKAT_GOLD_USD_PER_GRAM);
  const silver = envNumber(process.env.ZAKAT_SILVER_USD_PER_GRAM);
  if (gold && silver) {
    return { goldPerGramUSD: gold, silverPerGramUSD: silver, updatedAt: process.env.ZAKAT_PRICES_UPDATED_AT ?? null, source: "configured" };
  }
  return { goldPerGramUSD: null, silverPerGramUSD: null, updatedAt: null, source: "none" };
}
