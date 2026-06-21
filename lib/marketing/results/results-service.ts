import { marketingResults } from "./results-data";
import type { MarketingResultsOverview } from "./results-types";

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

export function getMarketingResultsOverview(): MarketingResultsOverview {
  const totalSpend = marketingResults.reduce((sum, item) => sum + item.spend, 0);
  const totalRevenue = marketingResults.reduce((sum, item) => sum + item.revenue, 0);
  const totalDonations = marketingResults.reduce((sum, item) => sum + item.donations, 0);
  const paidItems = marketingResults.filter((item) => item.spend > 0);
  const averageRoas = paidItems.length ? paidItems.reduce((sum, item) => sum + item.roas, 0) / paidItems.length : 0;

  return {
    source: "marketing-results-loop-foundation",
    generatedAt: new Date().toISOString(),
    summary: {
      totalResults: marketingResults.length,
      totalSpend,
      totalRevenue,
      totalDonations,
      averageRoas: roundToTwo(averageRoas),
      winners: marketingResults.filter((item) => item.status === "WINNER").length,
      losing: marketingResults.filter((item) => item.status === "LOSING").length,
    },
    results: marketingResults,
  };
}
