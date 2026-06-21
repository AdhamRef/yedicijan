import { productionItems, productionStages } from "./production-data";
import type { ProductionBoardOverview } from "./production-types";

export function getProductionBoardOverview(): ProductionBoardOverview {
  const columns = productionStages.map((stage) => ({
    ...stage,
    items: productionItems.filter((item) => item.stage === stage.stage),
  }));

  return {
    source: "production-board-foundation",
    generatedAt: new Date().toISOString(),
    summary: {
      totalItems: productionItems.length,
      inProduction: productionItems.filter((item) => !["READY", "PUBLISHED"].includes(item.stage)).length,
      ready: productionItems.filter((item) => item.stage === "READY").length,
      published: productionItems.filter((item) => item.stage === "PUBLISHED").length,
      usedInAds: productionItems.filter((item) => item.isUsedInAds).length,
      highPriority: productionItems.filter((item) => item.priority === "HIGH").length,
    },
    columns,
  };
}
