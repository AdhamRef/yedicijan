import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type JsonMap = Record<string, unknown>;

function isMap(value: unknown): value is JsonMap {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function cell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function statusFilter(status: string | null) {
  const normalized = status?.toUpperCase();
  if (normalized === "ARCHIVED" || normalized === "DELETED") return { status: normalized };
  if (normalized === "ALL") return {};
  return { $or: [{ status: "ACTIVE" }, { status: { $exists: false } }, { status: null }] };
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "ads");
  if (denied) return denied;

  const platform = request.nextUrl.searchParams.get("platform")?.toUpperCase();
  const status = request.nextUrl.searchParams.get("status");
  const search = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";

  const filter: JsonMap = statusFilter(status);
  if (platform && platform !== "ALL") filter.platform = platform;

  const result = await prisma.$runCommandRaw({
    find: "MarketingCampaignLink",
    filter,
    sort: { updatedAt: -1, createdAt: -1 },
    limit: 1000,
  }) as JsonMap;

  const rows = isMap(result.cursor) && Array.isArray(result.cursor.firstBatch) ? result.cursor.firstBatch.filter(isMap) : [];
  const filtered = search
    ? rows.filter((row) => [row.name, row.platform, row.url, row.campaignId, row.adsetId, row.adGroupId, row.adId, row.utmCampaign, row.targetCountry, row.objective, row.internalNotes].map(text).join(" ").toLowerCase().includes(search))
    : rows;

  const header = [
    "name", "status", "platform", "channel", "campaignId", "adsetId", "adGroupId", "adId", "utmCampaign", "targetCountry", "objective", "saveCount", "url", "internalNotes", "createdAt", "updatedAt"
  ];
  const lines = [header.map(cell).join(",")];
  for (const row of filtered) {
    lines.push([
      row.name,
      row.status || "ACTIVE",
      row.platform,
      row.channel,
      row.campaignId,
      row.adsetId,
      row.adGroupId,
      row.adId,
      row.utmCampaign,
      row.targetCountry,
      row.objective,
      row.saveCount || 0,
      row.url,
      row.internalNotes,
      row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    ].map(cell).join(","));
  }

  const csv = `\uFEFF${lines.join("\n")}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="campaign-links-${Date.now()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
