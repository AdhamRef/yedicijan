import { z } from "zod";
import { SUPPORTED_LOCALES } from "@/lib/locales";

const localeSchema = z.enum(SUPPORTED_LOCALES);
const contentSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(800).optional().default(""),
  ctaLabel: z.string().trim().min(1).max(80),
}).strict();

export const bannerInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(800).optional().default(""),
  ctaLabel: z.string().trim().min(1).max(80).optional().default("ساهم الآن"),
  imageUrl: z.string().url().refine((v) => {
    try { const u = new URL(v); return u.protocol === "https:" && !u.username && !u.password; }
    catch { return false; }
  }).optional().nullable(),
  campaignId: z.string().regex(/^[a-f0-9]{24}$/i),
  priority: z.number().int().min(0).max(10000).optional().default(0),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  translations: z.record(localeSchema, contentSchema).optional().default({}),
}).strict();

export type BannerInput = z.infer<typeof bannerInputSchema>;

export function validateBannerInput(payload: unknown) {
  const parsed = bannerInputSchema.safeParse(payload);
  if (!parsed.success) return { ok: false as const, error: "بيانات البانر غير صحيحة" };
  const b = parsed.data;
  const start = b.startsAt ? new Date(b.startsAt) : null;
  const end = b.endsAt ? new Date(b.endsAt) : null;
  if (start && end && end <= start) return { ok: false as const, error: "وقت انتهاء العرض يجب أن يكون بعد البداية" };
  // Only language variants with explicitly supplied translated copy can appear.
  const locales = ["ar", ...Object.keys(b.translations).filter((k) => k !== "ar")];
  if (b.translations.ar) {
    // Arabic master is the single source of truth. Reject contradictory Arabic variant.
    return { ok: false as const, error: "العربية تُدار من الحقول الأصلية؛ لا تُكررها ضمن الترجمات" };
  }
  return {
    ok: true as const,
    value: { ...b, startsAt: start, endsAt: end, locales },
  };
}
