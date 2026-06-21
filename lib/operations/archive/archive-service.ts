import { archiveAssets } from "./archive-data";
import type { ArchiveOverview } from "./archive-types";

export function getArchiveOverview(): ArchiveOverview {
  const tagCounts = new Map<string, number>();
  for (const asset of archiveAssets) {
    for (const tag of asset.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  return {
    source: "archive-center-foundation",
    generatedAt: new Date().toISOString(),
    summary: {
      totalAssets: archiveAssets.length,
      ready: archiveAssets.filter((asset) => asset.status === "READY").length,
      published: archiveAssets.filter((asset) => asset.status === "PUBLISHED" || asset.status === "USED_IN_ADS").length,
      usedInAds: archiveAssets.filter((asset) => asset.usedInAds).length,
      videos: archiveAssets.filter((asset) => asset.type === "VIDEO").length,
      designs: archiveAssets.filter((asset) => asset.type === "DESIGN" || asset.type === "CAROUSEL").length,
    },
    assets: archiveAssets,
    tagCloud: Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count),
  };
}
