/**
 * Zakat on wealth (zakat al-mal), pure arithmetic for the /zakat calculator.
 *
 * Nisab standards differ by authority: 85 g of gold is the common Arabic standard,
 * Türkiye's Diyanet uses 80.18 g, and the silver nisab is 595 g. The page lets the donor
 * choose; the Turkish locale defaults to Diyanet.
 */
export const ZAKAT_RATE = 0.025;
export const NISAB_GRAMS = { gold85: 85, goldDiyanet: 80.18, silver: 595 } as const;
export type NisabStandard = keyof typeof NISAB_GRAMS;

export const KARAT_PURITY = { "24": 1, "22": 22 / 24, "21": 21 / 24, "18": 18 / 24, "14": 14 / 24 } as const;
export type Karat = keyof typeof KARAT_PURITY;

export type ZakatInputs = {
  cash?: number;
  investments?: number;
  tradeStock?: number;
  tradeReceivables?: number;
  owedToYou?: number;
  goldGrams?: number;
  goldKarat?: Karat;
  silverGrams?: number;
  debts?: number;
};

export type MetalPrices = { goldPerGram: number; silverPerGram: number };

const n = (v: number | undefined) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

export function nisabValue(standard: NisabStandard, prices: MetalPrices): number {
  const grams = NISAB_GRAMS[standard];
  return standard === "silver" ? grams * n(prices.silverPerGram) : grams * n(prices.goldPerGram);
}

export function computeZakat(inputs: ZakatInputs, prices: MetalPrices, standard: NisabStandard) {
  const gold = n(inputs.goldGrams) * KARAT_PURITY[inputs.goldKarat ?? "24"] * n(prices.goldPerGram);
  const silver = n(inputs.silverGrams) * n(prices.silverPerGram);
  const assets =
    n(inputs.cash) + n(inputs.investments) + n(inputs.tradeStock) + n(inputs.tradeReceivables) + n(inputs.owedToYou) + gold + silver;
  const debts = n(inputs.debts);
  const net = Math.max(0, assets - debts);
  const nisab = nisabValue(standard, prices);
  const reachesNisab = nisab > 0 && net >= nisab;
  return {
    assets,
    debts,
    net,
    nisab,
    reachesNisab,
    zakat: reachesNisab ? Math.round(net * ZAKAT_RATE * 100) / 100 : 0,
    progress: nisab > 0 ? Math.min(1, net / nisab) : 0,
  };
}
