/**
 * Waqf funds page (/waqf) — what the dashboard edits and the page reads.
 * Pure helpers: validation and shaping, no database access (see lib/waqf/db.ts).
 */
import { SUPPORTED_LOCALES } from "@/lib/locales";

export const WAQF_MIN_SHARE_USD = 50;
export const FUND_KINDS = ["water", "mosques", "education", "housing", "energy", "orphans", "general"] as const;
export type FundKind = (typeof FUND_KINDS)[number];

export type FundText = { name: string; description: string; badge: string };
export type FundTexts = Partial<Record<(typeof SUPPORTED_LOCALES)[number], FundText>>;

export type WaqfFundDTO = {
  id: string;
  kind: FundKind;
  order: number;
  isActive: boolean;
  featured: boolean;
  image: string | null;
  shareUSD: number | null;
  campaignIds: string[];
  showProgress: boolean;
  texts: FundTexts;
};

export type WaqfSettingsDTO = {
  heroImage: string | null;
  storyImage: string | null;
  shareUSD: number;
  quickShares: number[];
  showDesignated: boolean;
};

export const DEFAULT_SETTINGS: WaqfSettingsDTO = {
  heroImage: null,
  storyImage: null,
  shareUSD: WAQF_MIN_SHARE_USD,
  quickShares: [1, 3, 5, 10],
  showDesignated: true,
};

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/** An uploaded image (https) or a bundled one (/images/...); anything else is dropped. */
export function cleanImage(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s || s.length > 1000) return null;
  if (/^https:\/\/[^\s"'<>]+$/i.test(s) || /^\/images\/[\w./-]+$/.test(s)) return s;
  return null;
}

function cleanText(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "";
}

export function cleanShareUSD(v: unknown, fallback: number | null): number | null {
  if (v === null || v === "" || v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1_000_000, Math.max(WAQF_MIN_SHARE_USD, Math.round(n * 100) / 100));
}

export function cleanTexts(v: unknown): FundTexts {
  const out: FundTexts = {};
  const src = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  for (const loc of SUPPORTED_LOCALES) {
    const t = src[loc] && typeof src[loc] === "object" ? (src[loc] as Record<string, unknown>) : null;
    if (!t) continue;
    const text = { name: cleanText(t.name, 80), description: cleanText(t.description, 240), badge: cleanText(t.badge, 40) };
    if (text.name || text.description || text.badge) out[loc] = text;
  }
  return out;
}

export type FundInput = Omit<WaqfFundDTO, "id" | "order">;

/** Validates a fund from the dashboard. Returns an Arabic error for the admin, or the clean fund. */
export function parseFundInput(body: unknown): { error: string } | { fund: FundInput } {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const kind = FUND_KINDS.includes(b.kind as FundKind) ? (b.kind as FundKind) : null;
  if (!kind) return { error: "نوع الصندوق غير صحيح" };
  const texts = cleanTexts(b.texts);
  if (!texts.ar?.name) return { error: "اسم الصندوق بالعربية مطلوب" };
  const ids = Array.isArray(b.campaignIds) ? b.campaignIds.filter((x): x is string => typeof x === "string" && OBJECT_ID.test(x)) : [];
  return {
    fund: {
      kind,
      isActive: b.isActive !== false,
      featured: b.featured === true,
      image: cleanImage(b.image),
      shareUSD: cleanShareUSD(b.shareUSD, null),
      campaignIds: [...new Set(ids)].slice(0, 50),
      showProgress: b.showProgress === true,
      texts,
    },
  };
}

export function parseSettingsInput(body: unknown): WaqfSettingsDTO {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const chips = Array.isArray(b.quickShares)
    ? [...new Set(b.quickShares.map((x) => Math.floor(Number(x))).filter((n) => Number.isFinite(n) && n >= 1 && n <= 1000))].sort((x, y) => x - y).slice(0, 6)
    : DEFAULT_SETTINGS.quickShares;
  return {
    heroImage: cleanImage(b.heroImage),
    storyImage: cleanImage(b.storyImage),
    shareUSD: cleanShareUSD(b.shareUSD, WAQF_MIN_SHARE_USD) ?? WAQF_MIN_SHARE_USD,
    quickShares: chips.length ? chips : DEFAULT_SETTINGS.quickShares,
    showDesignated: b.showDesignated !== false,
  };
}

/** Database row → the shape the page and the dashboard use. */
export function toFundDTO(row: Record<string, unknown>): WaqfFundDTO {
  return {
    id: String(row.id),
    kind: FUND_KINDS.includes(row.kind as FundKind) ? (row.kind as FundKind) : "general",
    order: Number(row.order) || 0,
    isActive: row.isActive !== false,
    featured: row.featured === true,
    image: cleanImage(row.image),
    shareUSD: typeof row.shareUSD === "number" ? row.shareUSD : null,
    campaignIds: Array.isArray(row.campaignIds) ? (row.campaignIds as string[]) : [],
    showProgress: row.showProgress === true,
    texts: cleanTexts(row.texts),
  };
}

export function toSettingsDTO(row: Record<string, unknown> | null): WaqfSettingsDTO {
  if (!row) return DEFAULT_SETTINGS;
  return parseSettingsInput(row);
}
