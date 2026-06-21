import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type JsonMap = Record<string, unknown>;

type CampaignLink = {
  _id?: unknown;
  name?: string;
  platform?: string;
  channel?: string;
  url?: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmId?: string | null;
  utmContent?: string | null;
  campaignId?: string | null;
  adGroupId?: string | null;
  adsetId?: string | null;
  adId?: string | null;
  targetCountry?: string | null;
  objective?: string | null;
  createdAt?: Date | string;
};

function isMap(value: unknown): value is JsonMap {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function objectIdString(value: unknown) {
  if (typeof value === "string") return value;
  if (isMap(value) && typeof value.$oid === "string") return value.$oid;
  return null;
}

function numberParam(request: NextRequest, key: string, fallback: number, min: number, max: number) {
  const raw = Number(request.nextUrl.searchParams.get(key));
  return Number.isFinite(raw) ? Math.max(min, Math.min(max, Math.floor(raw))) : fallback;
}

function unresolvedMacros(url: string | null | undefined) {
  if (!url) return [];
  const matches = url.match(/\{[^}]+\}|\[\[[^\]]+\]\]|%7B[^%]+%7D/gi);
  return [...new Set(matches ?? [])];
}

function hasUnsafeSpaces(url: string | null | undefined) {
  return Boolean(url && /\s/.test(url));
}

function validUrl(url: string | null | undefined) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function linkKey(link: CampaignLink, index: number) {
  return objectIdString(link._id) || `${link.platform || "UNKNOWN"}:${link.campaignId || link.utmCampaign || link.url || index}`;
}

function evaluate(link: CampaignLink, duplicateCount: number) {
  const warnings: string[] = [];
  const fixes: string[] = [];
  let score = 100;

  const url = str(link.url);
  const macros = unresolvedMacros(url);
  if (!url) {
    score -= 35;
    warnings.push("missing_url");
    fixes.push("أضف الرابط الكامل للحملة.");
  } else if (!validUrl(url)) {
    score -= 25;
    warnings.push("invalid_url");
    fixes.push("تأكد أن الرابط يبدأ بـ http أو https وأنه صالح.");
  }

  if (hasUnsafeSpaces(url)) {
    score -= 10;
    warnings.push("url_contains_spaces");
    fixes.push("أزل المسافات من الرابط أو استخدم encoding صحيح.");
  }

  if (macros.length > 0) {
    score -= 20;
    warnings.push("unresolved_macros");
    fixes.push("راجع macros غير المحلولة داخل الرابط قبل استخدامه في الإعلان.");
  }

  if (!str(link.platform)) {
    score -= 15;
    warnings.push("missing_platform");
    fixes.push("حدد المنصة مثل META أو GOOGLE_ADS أو TIKTOK.");
  }

  if (!str(link.utmSource)) {
    score -= 8;
    warnings.push("missing_utm_source");
    fixes.push("أضف utm_source لتحديد مصدر الزيارة.");
  }
  if (!str(link.utmMedium)) {
    score -= 8;
    warnings.push("missing_utm_medium");
    fixes.push("أضف utm_medium مثل paid_social أو cpc.");
  }
  if (!str(link.utmCampaign)) {
    score -= 12;
    warnings.push("missing_utm_campaign");
    fixes.push("أضف utm_campaign حتى يظهر اسم الحملة في التقارير.");
  }

  if (!str(link.campaignId) && !str(link.utmId)) {
    score -= 12;
    warnings.push("missing_campaign_identifier");
    fixes.push("أضف campaign_id أو utm_id لتحسين المطابقة مع بيانات المنصة.");
  }

  if (!str(link.adId) && !str(link.adsetId) && !str(link.adGroupId)) {
    score -= 8;
    warnings.push("missing_ad_identifiers");
    fixes.push("أضف ad_id أو adset_id/ad_group_id عندما يكون الرابط خاصًا بإعلان أو مجموعة.");
  }

  if (!str(link.targetCountry)) {
    score -= 4;
    warnings.push("missing_target_country");
    fixes.push("أضف target_country عند الحملات الموجهة لدولة محددة.");
  }

  if (duplicateCount > 1) {
    score -= 10;
    warnings.push("duplicate_url");
    fixes.push("يوجد أكثر من سجل لنفس الرابط؛ راجع التكرار حتى لا تختلط التقارير.");
  }

  score = Math.max(0, Math.min(100, score));
  const status = score >= 85 ? "healthy" : score >= 65 ? "needs_review" : "poor";
  return { score, status, warnings, fixes: [...new Set(fixes)], unresolvedMacros: macros };
}

async function getLinks(limit: number, platform?: string | null): Promise<CampaignLink[]> {
  const filter: JsonMap = platform ? { platform: platform.toUpperCase() } : {};
  const result = await prisma.$runCommandRaw({
    find: "MarketingCampaignLink",
    filter,
    sort: { createdAt: -1 },
    limit,
  }) as JsonMap;
  const rows = isMap(result.cursor) && Array.isArray(result.cursor.firstBatch) ? result.cursor.firstBatch : [];
  return rows.filter(isMap) as CampaignLink[];
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "ads");
  if (denied) return denied;

  const limit = numberParam(request, "limit", 100, 1, 500);
  const platform = str(request.nextUrl.searchParams.get("platform"));
  const links = await getLinks(limit, platform);

  const urlCounts = new Map<string, number>();
  for (const link of links) {
    const url = str(link.url);
    if (!url) continue;
    urlCounts.set(url, (urlCounts.get(url) || 0) + 1);
  }

  const rows = links.map((link, index) => {
    const url = str(link.url);
    const health = evaluate(link, url ? (urlCounts.get(url) || 0) : 0);
    return {
      id: linkKey(link, index),
      name: link.name || link.utmCampaign || link.campaignId || "Marketing link",
      platform: link.platform || null,
      channel: link.channel || null,
      url: link.url || null,
      createdAt: link.createdAt || null,
      identifiers: {
        utmSource: link.utmSource || null,
        utmMedium: link.utmMedium || null,
        utmCampaign: link.utmCampaign || null,
        utmId: link.utmId || null,
        campaignId: link.campaignId || null,
        adsetId: link.adsetId || link.adGroupId || null,
        adId: link.adId || null,
        targetCountry: link.targetCountry || null,
      },
      health,
    };
  }).sort((a, b) => a.health.score - b.health.score);

  return NextResponse.json({
    ok: true,
    platform: platform?.toUpperCase() ?? "ALL",
    summary: {
      links: rows.length,
      healthy: rows.filter((row) => row.health.status === "healthy").length,
      needsReview: rows.filter((row) => row.health.status === "needs_review").length,
      poor: rows.filter((row) => row.health.status === "poor").length,
      averageScore: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.health.score, 0) / rows.length) : 100,
    },
    links: rows,
  }, { headers: { "Cache-Control": "no-store" } });
}
