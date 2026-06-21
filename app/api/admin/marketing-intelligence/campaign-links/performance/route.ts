import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";
import { PAID_DONATION_FILTER, donationRowUsdApprox } from "@/lib/dashboard/donation-usd-revenue";

export const dynamic = "force-dynamic";

type JsonMap = Record<string, unknown>;
type LinkStatus = "ACTIVE" | "ARCHIVED" | "DELETED" | "ALL";
type RecommendationTone = "good" | "warning" | "danger" | "neutral";

type CampaignLink = {
  _id?: unknown;
  name?: string;
  platform?: string;
  channel?: string;
  url?: string;
  status?: string | null;
  saveCount?: number | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmId?: string | null;
  utmContent?: string | null;
  campaignId?: string | null;
  adGroupId?: string | null;
  adsetId?: string | null;
  adId?: string | null;
  audienceSegment?: string | null;
  messageVariant?: string | null;
  targetCountry?: string | null;
  objective?: string | null;
  internalNotes?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

function isMap(value: unknown): value is JsonMap { return typeof value === "object" && value !== null && !Array.isArray(value); }
function stringValue(value: unknown): string | null { return typeof value === "string" && value.trim() ? value.trim() : null; }
function attrString(attribution: unknown, key: string): string | null { return isMap(attribution) ? stringValue(attribution[key]) : null; }
function normalize(value: string | null | undefined) { return value?.trim().toLowerCase() || null; }
function numberParam(request: NextRequest, key: string, fallback: number, min: number, max: number) { const raw = Number(request.nextUrl.searchParams.get(key)); return Number.isFinite(raw) ? Math.max(min, Math.min(max, Math.floor(raw))) : fallback; }
function statusParam(request: NextRequest): LinkStatus { const status = stringValue(request.nextUrl.searchParams.get("status"))?.toUpperCase(); if (status === "ARCHIVED" || status === "DELETED" || status === "ALL") return status; return "ACTIVE"; }
function dateKey(date: Date) { return date.toISOString().slice(0, 10); }
function objectIdString(value: unknown) { if (typeof value === "string") return value; if (isMap(value) && typeof value.$oid === "string") return value.$oid; if (isMap(value) && typeof value.oid === "string") return value.oid; return null; }
function linkId(link: CampaignLink, index: number) { return objectIdString(link._id) || `${link.platform || "UNKNOWN"}:${link.campaignId || link.utmCampaign || link.url || index}`; }
function linkStatus(link: CampaignLink) { const status = typeof link.status === "string" ? link.status.toUpperCase() : "ACTIVE"; if (status === "ARCHIVED" || status === "DELETED") return status; return "ACTIVE"; }

function scoreMatch(link: CampaignLink, attribution: unknown) {
  let score = 0;
  const reasons: string[] = [];
  const platform = normalize(link.platform);
  const source = normalize(attrString(attribution, "utm_source") || attrString(attribution, "channel"));
  if (platform && source && (source.includes(platform) || platform.includes(source))) { score += 1; reasons.push("platform"); }
  const campaignId = normalize(link.campaignId || link.utmId);
  const donationCampaignId = normalize(attrString(attribution, "campaign_id") || attrString(attribution, "utm_id"));
  if (campaignId && donationCampaignId && campaignId === donationCampaignId) { score += 5; reasons.push("campaign_id"); }
  const adId = normalize(link.adId);
  const donationAdId = normalize(attrString(attribution, "ad_id"));
  if (adId && donationAdId && adId === donationAdId) { score += 6; reasons.push("ad_id"); }
  const adsetId = normalize(link.adsetId || link.adGroupId);
  const donationAdsetId = normalize(attrString(attribution, "adset_id") || attrString(attribution, "ad_group_id"));
  if (adsetId && donationAdsetId && adsetId === donationAdsetId) { score += 4; reasons.push("adset_id"); }
  const utmCampaign = normalize(link.utmCampaign);
  const donationUtmCampaign = normalize(attrString(attribution, "utm_campaign") || attrString(attribution, "campaign_name"));
  if (utmCampaign && donationUtmCampaign && utmCampaign === donationUtmCampaign) { score += 3; reasons.push("utm_campaign"); }
  const utmContent = normalize(link.utmContent);
  const donationUtmContent = normalize(attrString(attribution, "utm_content") || attrString(attribution, "ad_name"));
  if (utmContent && donationUtmContent && utmContent === donationUtmContent) { score += 2; reasons.push("utm_content"); }
  const targetCountry = normalize(link.targetCountry);
  const donationCountry = normalize(attrString(attribution, "target_country") || attrString(attribution, "ad_country"));
  if (targetCountry && donationCountry && targetCountry === targetCountry) { score += 1; reasons.push("target_country"); }
  return { score, reasons };
}

function qualityFromScore(score: number) { if (score >= 7) return "strong"; if (score >= 4) return "medium"; if (score >= 2) return "weak"; return "none"; }

function recommendationFor(args: { status: string; donations: number; revenue: number; strong: number; medium: number; weak: number; campaignId?: string | null; adId?: string | null; utmCampaign?: string | null; }) {
  const { status, donations, revenue, strong, medium, weak, campaignId, adId, utmCampaign } = args;
  if (status === "DELETED") return { tone: "neutral" as RecommendationTone, label: "محذوف", action: "لا يحتاج متابعة إلا إذا أردت استعادته." };
  if (status === "ARCHIVED") return { tone: "neutral" as RecommendationTone, label: "مؤرشف", action: "احتفظ به كسجل تاريخي ولا تستخدمه لحملات جديدة." };
  if (donations > 0 && strong > 0) return { tone: "good" as RecommendationTone, label: "رابط قوي", action: "استمر في استخدامه، ويمكن زيادة الميزانية أو تكرار نفس البنية في حملات مشابهة." };
  if (donations > 0 && strong === 0 && (medium > 0 || weak > 0)) return { tone: "warning" as RecommendationTone, label: "إسناد يحتاج تحسين", action: "راجع Campaign ID وAd ID داخل الرابط حتى تصبح المطابقة أقوى." };
  if (donations === 0 && (campaignId || adId || utmCampaign)) return { tone: "warning" as RecommendationTone, label: "بدون تبرعات", action: "راجع الاستهداف أو صفحة الهبوط، ولا تزود الميزانية قبل ظهور أول تبرع." };
  if (!campaignId && !utmCampaign) return { tone: "danger" as RecommendationTone, label: "ناقص بيانات", action: "أضف Campaign ID أو UTM Campaign حتى يمكن ربط التبرعات بالحملة." };
  if (revenue === 0) return { tone: "warning" as RecommendationTone, label: "لم يحقق إيراد", action: "استخدمه للاختبار فقط أو أوقفه إذا كان منشورًا في حملة نشطة." };
  return { tone: "neutral" as RecommendationTone, label: "قيد المراقبة", action: "راقب الأداء بعد وصول المزيد من الزيارات والتبرعات." };
}

async function getCampaignLinks(limit: number, platform?: string | null, status: LinkStatus = "ACTIVE"): Promise<CampaignLink[]> {
  const filter: JsonMap = {};
  if (platform) filter.platform = platform.toUpperCase();
  if (status !== "ALL") {
    if (status === "ACTIVE") filter.$or = [{ status: "ACTIVE" }, { status: { $exists: false } }, { status: null }];
    else filter.status = status;
  }
  const result = await prisma.$runCommandRaw({ find: "MarketingCampaignLink", filter, sort: { updatedAt: -1, createdAt: -1 }, limit }) as JsonMap;
  const rows = isMap(result.cursor) && Array.isArray(result.cursor.firstBatch) ? result.cursor.firstBatch : [];
  return rows.filter(isMap) as CampaignLink[];
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "ads");
  if (denied) return denied;
  const days = numberParam(request, "days", 7, 1, 90);
  const limit = numberParam(request, "limit", 100, 1, 500);
  const platform = stringValue(request.nextUrl.searchParams.get("platform"));
  const status = statusParam(request);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - days + 1);
  from.setHours(0, 0, 0, 0);
  const [links, donations] = await Promise.all([
    getCampaignLinks(limit, platform, status),
    prisma.donation.findMany({ where: { createdAt: { gte: from, lte: to }, ...PAID_DONATION_FILTER }, select: { id: true, amount: true, amountUSD: true, currency: true, createdAt: true, paidAt: true, attribution: true }, orderBy: { createdAt: "desc" }, take: 5000 }),
  ]);
  const rows = links.map((link, index) => {
    let donationsCount = 0;
    let revenue = 0;
    let strongMatches = 0;
    let mediumMatches = 0;
    let weakMatches = 0;
    const matchReasons = new Map<string, number>();
    const sampleDonations: Array<{ id: string; revenue: number; score: number; reasons: string[]; createdAt: string }> = [];
    if (linkStatus(link) !== "DELETED") {
      for (const donation of donations) {
        const match = scoreMatch(link, donation.attribution);
        if (match.score < 2) continue;
        const value = donationRowUsdApprox(donation);
        donationsCount += 1;
        revenue += value;
        const quality = qualityFromScore(match.score);
        if (quality === "strong") strongMatches += 1;
        else if (quality === "medium") mediumMatches += 1;
        else weakMatches += 1;
        for (const reason of match.reasons) matchReasons.set(reason, (matchReasons.get(reason) || 0) + 1);
        if (sampleDonations.length < 10) sampleDonations.push({ id: donation.id, revenue: value, score: match.score, reasons: match.reasons, createdAt: donation.createdAt.toISOString() });
      }
    }
    const currentStatus = linkStatus(link);
    return {
      id: linkId(link, index),
      name: link.name || link.utmCampaign || link.campaignId || "Marketing link",
      platform: link.platform || null,
      channel: link.channel || null,
      url: link.url || null,
      status: currentStatus,
      saveCount: typeof link.saveCount === "number" ? link.saveCount : 0,
      createdAt: link.createdAt || null,
      updatedAt: link.updatedAt || null,
      identifiers: { utmCampaign: link.utmCampaign || null, utmId: link.utmId || null, campaignId: link.campaignId || null, adsetId: link.adsetId || link.adGroupId || null, adId: link.adId || null, targetCountry: link.targetCountry || null },
      metadata: { objective: link.objective || null, audienceSegment: link.audienceSegment || null, messageVariant: link.messageVariant || null, internalNotes: link.internalNotes || null },
      recommendation: recommendationFor({ status: currentStatus, donations: donationsCount, revenue, strong: strongMatches, medium: mediumMatches, weak: weakMatches, campaignId: link.campaignId, adId: link.adId, utmCampaign: link.utmCampaign }),
      performance: { donations: donationsCount, revenue, averageDonation: donationsCount > 0 ? revenue / donationsCount : 0, matchQuality: { strong: strongMatches, medium: mediumMatches, weak: weakMatches }, matchReasons: Object.fromEntries([...matchReasons.entries()].sort((a, b) => b[1] - a[1])) },
      samples: sampleDonations,
    };
  }).sort((a, b) => b.performance.revenue - a.performance.revenue);
  return NextResponse.json({ ok: true, range: { from: dateKey(from), to: dateKey(to), days, dateBasis: "createdAt" }, status, links: rows, summary: { links: rows.length, activeLinks: rows.filter((row) => row.status === "ACTIVE").length, archivedLinks: rows.filter((row) => row.status === "ARCHIVED").length, deletedLinks: rows.filter((row) => row.status === "DELETED").length, linksWithDonations: rows.filter((row) => row.performance.donations > 0).length, donationsConsidered: donations.length, revenueMatched: rows.reduce((sum, row) => sum + row.performance.revenue, 0) } }, { headers: { "Cache-Control": "no-store" } });
}
