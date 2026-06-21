import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createHash } from "crypto";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type JsonMap = Record<string, unknown>;
type LinkStatus = "ACTIVE" | "ARCHIVED" | "DELETED";

type CampaignLinkPayload = {
  name?: string;
  platform?: string;
  channel?: string;
  url?: string;
  basePath?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmId?: string;
  utmContent?: string;
  campaignId?: string;
  adGroupId?: string;
  adsetId?: string;
  adId?: string;
  audienceSegment?: string;
  messageVariant?: string;
  targetCountry?: string;
  objective?: string;
  internalNotes?: string;
  raw?: JsonMap;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value.trim().slice(0, 1000) || null : null;
}

function urlHash(url: string) {
  return createHash("sha256").update(url).digest("hex");
}

function readPayload(body: JsonMap): CampaignLinkPayload {
  return {
    name: readString(body.name) ?? undefined,
    platform: readString(body.platform)?.toUpperCase() ?? undefined,
    channel: readString(body.channel)?.toUpperCase() ?? undefined,
    url: readString(body.url) ?? undefined,
    basePath: readString(body.basePath) ?? undefined,
    utmSource: readString(body.utmSource) ?? readString(body.utm_source) ?? undefined,
    utmMedium: readString(body.utmMedium) ?? readString(body.utm_medium) ?? undefined,
    utmCampaign: readString(body.utmCampaign) ?? readString(body.utm_campaign) ?? undefined,
    utmId: readString(body.utmId) ?? readString(body.utm_id) ?? undefined,
    utmContent: readString(body.utmContent) ?? readString(body.utm_content) ?? undefined,
    campaignId: readString(body.campaignId) ?? readString(body.campaign_id) ?? undefined,
    adGroupId: readString(body.adGroupId) ?? readString(body.ad_group_id) ?? undefined,
    adsetId: readString(body.adsetId) ?? readString(body.adset_id) ?? undefined,
    adId: readString(body.adId) ?? readString(body.ad_id) ?? undefined,
    audienceSegment: readString(body.audienceSegment) ?? readString(body.audience_segment) ?? undefined,
    messageVariant: readString(body.messageVariant) ?? readString(body.message_variant) ?? undefined,
    targetCountry: readString(body.targetCountry)?.toUpperCase() ?? readString(body.target_country)?.toUpperCase() ?? undefined,
    objective: readString(body.objective) ?? undefined,
    internalNotes: readOptionalString(body.internalNotes) ?? readOptionalString(body.internal_notes) ?? undefined,
    raw: typeof body.raw === "object" && body.raw !== null && !Array.isArray(body.raw) ? body.raw as JsonMap : undefined,
  };
}

function objectIdFilter(id: string) {
  return /^[a-f\d]{24}$/i.test(id) ? { _id: { $oid: id } } : null;
}

async function ensureIndexes() {
  await prisma.$runCommandRaw({ createIndexes: "MarketingCampaignLink", indexes: [
    { key: { createdAt: -1 }, name: "createdAt_desc" },
    { key: { platform: 1, createdAt: -1 }, name: "platform_createdAt" },
    { key: { status: 1, updatedAt: -1 }, name: "status_updatedAt" },
    { key: { campaignId: 1 }, name: "campaignId" },
    { key: { adId: 1 }, name: "adId" },
    { key: { utmCampaign: 1 }, name: "utmCampaign" },
    { key: { urlHash: 1 }, name: "urlHash_unique", unique: true },
  ] }).catch(() => null);
}

function numberParam(request: NextRequest, key: string, fallback: number, min: number, max: number) {
  const raw = Number(request.nextUrl.searchParams.get(key));
  return Number.isFinite(raw) ? Math.max(min, Math.min(max, Math.floor(raw))) : fallback;
}

function statusParam(request: NextRequest): LinkStatus | "ALL" {
  const status = readString(request.nextUrl.searchParams.get("status"))?.toUpperCase();
  if (status === "ARCHIVED" || status === "DELETED" || status === "ALL") return status;
  return "ACTIVE";
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "ads");
  if (denied) return denied;

  await ensureIndexes();
  const limit = numberParam(request, "limit", 50, 1, 200);
  const platform = readString(request.nextUrl.searchParams.get("platform"))?.toUpperCase();
  const status = statusParam(request);
  const filter: JsonMap = {};
  if (platform) filter.platform = platform;
  if (status !== "ALL") {
    if (status === "ACTIVE") filter.$or = [{ status: "ACTIVE" }, { status: { $exists: false } }, { status: null }];
    else filter.status = status;
  }

  const result = await prisma.$runCommandRaw({
    find: "MarketingCampaignLink",
    filter,
    sort: { updatedAt: -1, createdAt: -1 },
    limit,
  }) as JsonMap;

  const rows = typeof result.cursor === "object" && result.cursor && Array.isArray((result.cursor as JsonMap).firstBatch)
    ? (result.cursor as JsonMap).firstBatch
    : [];

  return NextResponse.json({ ok: true, status, links: rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "ads");
  if (denied) return denied;

  await ensureIndexes();
  const body = (await request.json().catch(() => ({}))) as JsonMap;
  const payload = readPayload(body);

  if (!payload.url) return NextResponse.json({ ok: false, error: "missing url" }, { status: 400 });
  if (!payload.platform) return NextResponse.json({ ok: false, error: "missing platform" }, { status: 400 });

  const now = new Date();
  const hash = urlHash(payload.url);
  const document = {
    name: payload.name ?? payload.utmCampaign ?? payload.campaignId ?? "Marketing link",
    platform: payload.platform,
    channel: payload.channel ?? payload.platform,
    url: payload.url,
    urlHash: hash,
    basePath: payload.basePath ?? null,
    utmSource: payload.utmSource ?? null,
    utmMedium: payload.utmMedium ?? null,
    utmCampaign: payload.utmCampaign ?? null,
    utmId: payload.utmId ?? null,
    utmContent: payload.utmContent ?? null,
    campaignId: payload.campaignId ?? null,
    adGroupId: payload.adGroupId ?? null,
    adsetId: payload.adsetId ?? null,
    adId: payload.adId ?? null,
    audienceSegment: payload.audienceSegment ?? null,
    messageVariant: payload.messageVariant ?? null,
    targetCountry: payload.targetCountry ?? null,
    objective: payload.objective ?? null,
    internalNotes: payload.internalNotes ?? null,
    status: "ACTIVE",
    createdBy: session?.user?.id ?? null,
    raw: payload.raw ?? body,
    updatedAt: now,
  };

  const result = await prisma.$runCommandRaw({
    update: "MarketingCampaignLink",
    updates: [{
      q: { urlHash: hash },
      u: {
        $set: document,
        $setOnInsert: { createdAt: now },
        $inc: { saveCount: 1 },
      },
      upsert: true,
    }],
  }) as JsonMap;

  const upserted = Array.isArray(result.upserted) && result.upserted.length > 0;
  return NextResponse.json({ ok: true, upserted, matched: result.n ?? 1, link: { ...document, createdAt: now } });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "ads");
  if (denied) return denied;

  await ensureIndexes();
  const body = (await request.json().catch(() => ({}))) as JsonMap;
  const id = readString(body.id);
  const action = readString(body.action)?.toUpperCase();
  if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  const filter = objectIdFilter(id) ?? { urlHash: id };

  const now = new Date();
  if (action === "UPDATE") {
    const payload = readPayload(body);
    const editable: JsonMap = {
      updatedAt: now,
      editedAt: now,
      editedBy: session?.user?.id ?? null,
      editedByName: readString(session?.user?.name),
    };
    if (payload.name !== undefined) editable.name = payload.name || "Marketing link";
    if (payload.platform !== undefined) editable.platform = payload.platform;
    if (payload.channel !== undefined) editable.channel = payload.channel;
    if (payload.utmCampaign !== undefined) editable.utmCampaign = payload.utmCampaign ?? null;
    if (payload.utmId !== undefined) editable.utmId = payload.utmId ?? null;
    if (payload.utmContent !== undefined) editable.utmContent = payload.utmContent ?? null;
    if (payload.campaignId !== undefined) editable.campaignId = payload.campaignId ?? null;
    if (payload.adGroupId !== undefined) editable.adGroupId = payload.adGroupId ?? null;
    if (payload.adsetId !== undefined) editable.adsetId = payload.adsetId ?? null;
    if (payload.adId !== undefined) editable.adId = payload.adId ?? null;
    if (payload.audienceSegment !== undefined) editable.audienceSegment = payload.audienceSegment ?? null;
    if (payload.messageVariant !== undefined) editable.messageVariant = payload.messageVariant ?? null;
    if (payload.targetCountry !== undefined) editable.targetCountry = payload.targetCountry ?? null;
    if (payload.objective !== undefined) editable.objective = payload.objective ?? null;
    if (payload.internalNotes !== undefined) editable.internalNotes = payload.internalNotes ?? null;

    const result = await prisma.$runCommandRaw({
      update: "MarketingCampaignLink",
      updates: [{ q: filter, u: { $set: editable }, multi: false }],
    }) as JsonMap;
    return NextResponse.json({ ok: true, matched: result.n ?? 0, action: "UPDATE" });
  }

  let status: LinkStatus;
  if (action === "ARCHIVE") status = "ARCHIVED";
  else if (action === "DELETE") status = "DELETED";
  else if (action === "RESTORE") status = "ACTIVE";
  else return NextResponse.json({ ok: false, error: "invalid action" }, { status: 400 });

  const update: JsonMap = {
    status,
    updatedAt: now,
    reviewedBy: session?.user?.id ?? null,
    reviewedByName: readString(session?.user?.name),
  };
  if (status === "ARCHIVED") update.archivedAt = now;
  if (status === "DELETED") update.deletedAt = now;
  if (status === "ACTIVE") {
    update.restoredAt = now;
    update.archivedAt = null;
    update.deletedAt = null;
  }

  const result = await prisma.$runCommandRaw({
    update: "MarketingCampaignLink",
    updates: [{ q: filter, u: { $set: update }, multi: false }],
  }) as JsonMap;

  return NextResponse.json({ ok: true, matched: result.n ?? 0, status });
}
