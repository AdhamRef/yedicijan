import { normalizeUserSlug } from "../slug";

export const ACTIVE_CATEGORY_TRANSLATION_LOCALES = [
  "en", "fr", "tr", "id", "pt", "es", "de",
] as const;

export type CategoryTranslationWrite = {
  locale: string;
  name: string;
  description: string;
  requestedSlug: string | null;
};

export type CategoryCreatePayload = {
  name: string;
  description: string;
  image: string;
  icon: string;
  order: number;
  requestedSlug: string | null;
  translations: CategoryTranslationWrite[];
};

export class CategoryCreateInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CategoryCreateInputError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function textValue(value: unknown, label: string, maxLength: number): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new CategoryCreateInputError(`${label}: قيمة غير صالحة.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new CategoryCreateInputError(`${label}: النص أطول من الحد المسموح.`);
  }
  return trimmed;
}

/**
 * Validates the JSON payload without relying on browser-only Zod checks.
 * The public category routes must not inherit languages from other institutions.
 */
export function parseCategoryCreatePayload(raw: unknown): CategoryCreatePayload {
  if (!isRecord(raw)) throw new CategoryCreateInputError("بيانات التصنيف غير صالحة.");

  const name = textValue(raw.name, "اسم التصنيف بالعربية", 100);
  if (!name) throw new CategoryCreateInputError("اسم التصنيف بالعربية مطلوب.");

  const description = textValue(raw.description, "وصف التصنيف", 1000);
  const image = textValue(raw.image, "رابط الصورة", 2000);
  if (image) {
    let url: URL;
    try {
      url = new URL(image);
    } catch {
      throw new CategoryCreateInputError("رابط الصورة غير صالح.");
    }
    if (url.protocol !== "https:") {
      throw new CategoryCreateInputError("يجب أن يكون رابط الصورة آمناً (HTTPS).");
    }
  }
  const icon = textValue(raw.icon, "أيقونة التصنيف", 200);
  const order = raw.order === undefined || raw.order === null ? 0 : raw.order;
  if (typeof order !== "number" || !Number.isSafeInteger(order)) {
    throw new CategoryCreateInputError("ترتيب التصنيف يجب أن يكون عدداً صحيحاً.");
  }
  const translations = raw.translations;
  if (!isRecord(translations)) {
    throw new CategoryCreateInputError("الاسم الإنجليزي للتصنيف مطلوب.");
  }

  for (const [locale, value] of Object.entries(translations)) {
    if (locale === "ar") continue;
    if (!(ACTIVE_CATEGORY_TRANSLATION_LOCALES as readonly string[]).includes(locale)) {
      throw new CategoryCreateInputError("لغة الترجمة غير مفعلة في يدي جيهان.");
    }
    if (value !== null && value !== undefined && !isRecord(value)) {
      throw new CategoryCreateInputError("صيغة بيانات الترجمة غير صالحة.");
    }
  }

  const writes: CategoryTranslationWrite[] = [];
  for (const locale of ACTIVE_CATEGORY_TRANSLATION_LOCALES) {
    const value = translations[locale];
    if (value === undefined || value === null) {
      if (locale === "en") throw new CategoryCreateInputError("اسم التصنيف بالإنجليزية مطلوب.");
      continue;
    }
    const row = value as Record<string, unknown>;
    const translatedName = textValue(row.name, `اسم التصنيف (${locale})`, 100);
    const translatedDescription = textValue(row.description, `وصف التصنيف (${locale})`, 1000);
    if (!translatedName) {
      if (locale === "en") throw new CategoryCreateInputError("اسم التصنيف بالإنجليزية مطلوب.");
      if (translatedDescription) {
        throw new CategoryCreateInputError(`أدخل اسم الترجمة (${locale}) أو احذف وصفها.`);
      }
      continue;
    }
    writes.push({
      locale,
      name: translatedName,
      description: translatedDescription,
      requestedSlug: normalizeUserSlug(row.slug),
    });
  }

  if (!writes.some((translation) => translation.locale === "en")) {
    throw new CategoryCreateInputError("اسم التصنيف بالإنجليزية مطلوب.");
  }

  return {
    name,
    description,
    image,
    icon,
    order,
    requestedSlug: normalizeUserSlug(raw.slug),
    translations: writes,
  };
}
