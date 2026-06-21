import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";

const TRANSLATION_LOCALES = ["en", "fr", "tr", "id", "pt", "es", "de"] as const;
const SUPPORTED_LOCALES = ["ar", ...TRANSLATION_LOCALES] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];
type TranslationLocale = (typeof TRANSLATION_LOCALES)[number];
type Section = "campaigns" | "categories" | "blog";
type ItemType = "campaign" | "category" | "post" | "postCategory";

type PreviewRow = {
  id: string;
  type: ItemType;
  label: string;
  typeLabel: string;
  locale: Locale;
  sourceArabic: Record<string, string | null>;
  currentTranslation: Record<string, string | null>;
  suggestedTranslation: Record<string, string>;
  missingFields: string[];
  emptyFields: string[];
  identicalToArabicFields: string[];
  qualityNotes?: string[];
};

const LOCALE_NAMES: Record<Locale, string> = {
  ar: "Arabic",
  en: "English",
  fr: "French",
  tr: "Turkish",
  id: "Indonesian",
  pt: "Portuguese",
  es: "Spanish",
  de: "German",
};

const LOCALE_STYLE_GUIDE: Record<Locale, string> = {
  ar: "Proofread and polish the Arabic source itself. Use elegant, clear Modern Standard Arabic suitable for humanitarian fundraising. Correct spelling, grammar, hamza forms, punctuation, agreement, and awkward phrasing while preserving meaning and facts.",
  en: "Use warm, natural nonprofit English. Avoid literal Arabic structure. Keep donation language trustworthy and concise.",
  fr: "Use polished humanitarian French with correct accents, grammar, and natural nonprofit terminology. Avoid word-for-word Arabic calques.",
  tr: "Use natural Turkish nonprofit language. Prefer clear, respectful phrases used by charitable associations in Turkiye.",
  id: "Use clear, warm Indonesian suitable for humanitarian fundraising. Keep the tone sincere and professional.",
  pt: "Use polished Portuguese suitable for international humanitarian fundraising. Keep grammar, accents, and wording natural.",
  es: "Use natural Spanish suitable for humanitarian fundraising. Keep a respectful, clear, donor-facing tone.",
  de: "Use polished native-level German for humanitarian fundraising. Use correct grammar, case, articles, compounds, and natural German phrasing. Avoid literal translations from Arabic.",
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEmpty(value: unknown) {
  return normalizeText(value).length === 0;
}

function sameAsArabic(arabic: unknown, translated: unknown) {
  const ar = normalizeText(arabic);
  const tr = normalizeText(translated);
  return Boolean(ar && tr && ar === tr);
}

function safeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value;
}

function isTranslationLocale(locale: Locale): locale is TranslationLocale {
  return locale !== "ar" && TRANSLATION_LOCALES.includes(locale as TranslationLocale);
}

function makePreviewRow(input: {
  id: string;
  type: ItemType;
  label: string;
  typeLabel: string;
  locale: TranslationLocale;
  fields: string[];
  sourceArabic: Record<string, string | null>;
  translation?: Record<string, any> | null;
}): PreviewRow | null {
  const missingFields: string[] = [];
  const emptyFields: string[] = [];
  const identicalToArabicFields: string[] = [];
  const currentTranslation: Record<string, string | null> = {};
  const suggestedTranslation: Record<string, string> = {};

  for (const field of input.fields) {
    const currentValue = input.translation && field in input.translation ? safeString(input.translation[field]) : null;
    currentTranslation[field] = currentValue;

    if (!input.translation || !(field in input.translation)) missingFields.push(field);
    else if (isEmpty(currentValue)) emptyFields.push(field);
    else if (sameAsArabic(input.sourceArabic[field], currentValue)) identicalToArabicFields.push(field);

    suggestedTranslation[field] = currentValue && !sameAsArabic(input.sourceArabic[field], currentValue) ? currentValue : "";
  }

  const needsWork = missingFields.length > 0 || emptyFields.length > 0 || identicalToArabicFields.length > 0;
  if (!needsWork) return null;

  return {
    id: input.id,
    type: input.type,
    label: input.label,
    typeLabel: input.typeLabel,
    locale: input.locale,
    sourceArabic: input.sourceArabic,
    currentTranslation,
    suggestedTranslation,
    missingFields,
    emptyFields,
    identicalToArabicFields,
  };
}

function makeArabicProofreadRow(input: {
  id: string;
  type: ItemType;
  label: string;
  typeLabel: string;
  fields: string[];
  sourceArabic: Record<string, string | null>;
}): PreviewRow {
  const currentTranslation: Record<string, string | null> = {};
  const suggestedTranslation: Record<string, string> = {};
  const emptyFields: string[] = [];

  for (const field of input.fields) {
    const value = input.sourceArabic[field] ?? null;
    currentTranslation[field] = value;
    suggestedTranslation[field] = value || "";
    if (isEmpty(value)) emptyFields.push(field);
  }

  return {
    id: input.id,
    type: input.type,
    label: input.label,
    typeLabel: input.typeLabel,
    locale: "ar",
    sourceArabic: input.sourceArabic,
    currentTranslation,
    suggestedTranslation,
    missingFields: [],
    emptyFields,
    identicalToArabicFields: [],
  };
}

async function loadPreviewRows(section: Section, locale: Locale, limit: number): Promise<PreviewRow[]> {
  if (section === "campaigns") {
    const campaigns = await prisma.campaign.findMany({ orderBy: { createdAt: "desc" }, include: { translations: true }, take: 200 });
    if (locale === "ar") {
      return campaigns
        .map((item: any) => makeArabicProofreadRow({
          id: item.id,
          type: "campaign",
          label: item.title || "بدون عنوان",
          typeLabel: "مشروع",
          fields: ["title", "description"],
          sourceArabic: { title: item.title ?? null, description: item.description ?? null },
        }))
        .slice(0, limit);
    }

    return campaigns
      .map((item: any) => makePreviewRow({
        id: item.id,
        type: "campaign",
        label: item.title || "بدون عنوان",
        typeLabel: "مشروع",
        locale,
        fields: ["title", "description"],
        sourceArabic: { title: item.title ?? null, description: item.description ?? null },
        translation: item.translations?.find((row: any) => row.locale === locale),
      }))
      .filter(Boolean)
      .slice(0, limit) as PreviewRow[];
  }

  if (section === "categories") {
    const categories = await prisma.category.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], include: { translations: true }, take: 200 });
    if (locale === "ar") {
      return categories
        .map((item: any) => makeArabicProofreadRow({
          id: item.id,
          type: "category",
          label: item.name || "بدون اسم",
          typeLabel: "حملة / تصنيف",
          fields: ["name", "description"],
          sourceArabic: { name: item.name ?? null, description: item.description ?? null },
        }))
        .slice(0, limit);
    }

    return categories
      .map((item: any) => makePreviewRow({
        id: item.id,
        type: "category",
        label: item.name || "بدون اسم",
        typeLabel: "حملة / تصنيف",
        locale,
        fields: ["name", "description"],
        sourceArabic: { name: item.name ?? null, description: item.description ?? null },
        translation: item.translations?.find((row: any) => row.locale === locale),
      }))
      .filter(Boolean)
      .slice(0, limit) as PreviewRow[];
  }

  const [posts, postCategories] = await Promise.all([
    prisma.post.findMany({ orderBy: { createdAt: "desc" }, include: { translations: true }, take: 200 }),
    prisma.postCategory.findMany({ orderBy: { createdAt: "desc" }, include: { translations: true }, take: 200 }),
  ]);

  if (locale === "ar") {
    const postRows = posts.map((item: any) => makeArabicProofreadRow({
      id: item.id,
      type: "post",
      label: item.title || "بدون عنوان",
      typeLabel: "مقال",
      fields: ["title", "description", "content"],
      sourceArabic: { title: item.title ?? null, description: item.description ?? null, content: item.content ?? null },
    }));

    const categoryRows = postCategories.map((item: any) => makeArabicProofreadRow({
      id: item.id,
      type: "postCategory",
      label: item.name || "بدون اسم",
      typeLabel: "تصنيف مدونة",
      fields: ["name", "title", "description"],
      sourceArabic: { name: item.name ?? null, title: item.title ?? null, description: item.description ?? null },
    }));

    return [...postRows, ...categoryRows].slice(0, limit);
  }

  const postRows = posts.map((item: any) => makePreviewRow({
    id: item.id,
    type: "post",
    label: item.title || "بدون عنوان",
    typeLabel: "مقال",
    locale,
    fields: ["title", "description", "content"],
    sourceArabic: { title: item.title ?? null, description: item.description ?? null, content: item.content ?? null },
    translation: item.translations?.find((row: any) => row.locale === locale),
  }));

  const categoryRows = postCategories.map((item: any) => makePreviewRow({
    id: item.id,
    type: "postCategory",
    label: item.name || "بدون اسم",
    typeLabel: "تصنيف مدونة",
    locale,
    fields: ["name", "title", "description"],
    sourceArabic: { name: item.name ?? null, title: item.title ?? null, description: item.description ?? null },
    translation: item.translations?.find((row: any) => row.locale === locale),
  }));

  return [...postRows, ...categoryRows].filter(Boolean).slice(0, limit) as PreviewRow[];
}

function sanitizeFields(type: ItemType, fields: Record<string, unknown>) {
  const allowed: Record<ItemType, string[]> = {
    campaign: ["title", "description"],
    category: ["name", "description"],
    post: ["title", "description", "content"],
    postCategory: ["name", "title", "description"],
  };

  const output: Record<string, string> = {};
  for (const field of allowed[type]) {
    const value = fields[field];
    if (typeof value === "string" && value.trim()) output[field] = value.trim();
  }
  return output;
}

function stripCodeFence(value: string) {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
}

function compactText(value: string | null | undefined, max = 9000) {
  if (!value) return "";
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}\n...[trimmed for review]` : trimmed;
}

async function generateProfessionalTranslation(row: PreviewRow, locale: Locale): Promise<PreviewRow> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const fields = Object.keys(row.sourceArabic || {});
  const sourceArabic = Object.fromEntries(fields.map((field) => [field, compactText(row.sourceArabic[field])]));
  const currentTranslation = Object.fromEntries(fields.map((field) => [field, compactText(row.currentTranslation[field])]));

  const task = locale === "ar"
    ? "Proofread and professionally rewrite the Arabic fields in polished Modern Standard Arabic. Correct spelling, grammar, hamza forms, punctuation, agreement, sentence flow, and fundraising tone. Do not translate to another language."
    : "Translate and proofread the provided fields from Arabic into the target language.";

  const prompt = [
    "You are a senior humanitarian fundraising editor, native-level proofreader, and professional translator.",
    `Target language: ${LOCALE_NAMES[locale]} (${locale}).`,
    LOCALE_STYLE_GUIDE[locale],
    task,
    "Preserve meaning, humanitarian sensitivity, names, locations, numbers, currency symbols, URLs, and placeholders exactly.",
    "Do not invent facts, amounts, dates, beneficiaries, locations, or promises.",
    "Return strict JSON only in this shape: {\"fields\":{...},\"qualityNotes\":[\"...\"]}",
    "Use exactly the same field keys. If the source field is empty, return an empty string for that key.",
    `Item type: ${row.typeLabel}`,
    `Arabic source JSON: ${JSON.stringify(sourceArabic)}`,
    `Current text JSON: ${JSON.stringify(currentTranslation)}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.CONTENT_LOCALIZATION_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return valid JSON only. Be precise, culturally sensitive, and never fabricate details." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`AI translation failed: ${response.status} ${details.slice(0, 300)}`);
  }

  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content;
  if (!raw || typeof raw !== "string") throw new Error("AI translation returned no content");

  const parsed = JSON.parse(stripCodeFence(raw));
  const generatedFields = parsed?.fields && typeof parsed.fields === "object" ? parsed.fields : {};
  const suggestedTranslation = { ...row.suggestedTranslation };

  for (const field of fields) {
    const generated = generatedFields[field];
    if (typeof generated === "string") suggestedTranslation[field] = generated.trim();
  }

  return {
    ...row,
    suggestedTranslation,
    qualityNotes: Array.isArray(parsed?.qualityNotes) ? parsed.qualityNotes.filter((x: unknown) => typeof x === "string") : [],
  };
}

async function generateRows(section: Section, locale: Locale, limit: number) {
  const rows = await loadPreviewRows(section, locale, Math.min(limit, 10));
  const generated: PreviewRow[] = [];
  for (const row of rows) generated.push(await generateProfessionalTranslation(row, locale));
  return generated;
}

async function saveArabicRow(type: ItemType, id: string, fields: Record<string, string>) {
  if (type === "campaign") {
    await prisma.campaign.update({ where: { id }, data: { ...(fields.title ? { title: fields.title } : {}), ...(fields.description ? { description: fields.description } : {}) } });
    return;
  }

  if (type === "category") {
    await prisma.category.update({ where: { id }, data: { ...(fields.name ? { name: fields.name } : {}), ...(fields.description ? { description: fields.description } : {}) } });
    return;
  }

  if (type === "post") {
    await prisma.post.update({ where: { id }, data: { ...(fields.title ? { title: fields.title } : {}), ...(fields.description ? { description: fields.description } : {}), ...(fields.content ? { content: fields.content } : {}) } });
    return;
  }

  if (type === "postCategory") {
    await prisma.postCategory.update({ where: { id }, data: { ...(fields.name ? { name: fields.name } : {}), ...(fields.title ? { title: fields.title } : {}), ...(fields.description ? { description: fields.description } : {}) } });
  }
}

async function saveRow(type: ItemType, id: string, locale: Locale, fields: Record<string, string>) {
  if (Object.keys(fields).length === 0) throw new Error("No non-empty fields to save");

  if (locale === "ar") {
    await saveArabicRow(type, id, fields);
    return;
  }

  if (!isTranslationLocale(locale)) throw new Error("Invalid translation locale");

  if (type === "campaign") {
    if (!fields.title || !fields.description) throw new Error("Campaign title and description are required");
    await prisma.campaignTranslation.upsert({
      where: { campaignId_locale: { campaignId: id, locale } },
      create: { campaignId: id, locale, title: fields.title, description: fields.description },
      update: { title: fields.title, description: fields.description },
    });
    return;
  }

  if (type === "category") {
    if (!fields.name) throw new Error("Category name is required");
    await prisma.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: id, locale } },
      create: { categoryId: id, locale, name: fields.name, description: fields.description || null },
      update: { name: fields.name, description: fields.description || null },
    });
    return;
  }

  if (type === "post") {
    await prisma.postTranslation.upsert({
      where: { postId_locale: { postId: id, locale } },
      create: { postId: id, locale, title: fields.title || null, description: fields.description || null, content: fields.content || null },
      update: { ...(fields.title ? { title: fields.title } : {}), ...(fields.description ? { description: fields.description } : {}), ...(fields.content ? { content: fields.content } : {}) },
    });
    return;
  }

  if (type === "postCategory") {
    if (!fields.name) throw new Error("Post category name is required");
    await prisma.postCategoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: id, locale } },
      create: { categoryId: id, locale, name: fields.name, title: fields.title || null, description: fields.description || null },
      update: { name: fields.name, title: fields.title || null, description: fields.description || null },
    });
  }
}

async function verifyRowSaved(type: ItemType, id: string, locale: Locale, fields: Record<string, string>) {
  if (locale === "ar") return true;
  if (!isTranslationLocale(locale)) return false;

  if (type === "campaign") {
    const row = await prisma.campaignTranslation.findUnique({ where: { campaignId_locale: { campaignId: id, locale } } });
    return Boolean(row && Object.entries(fields).every(([key, value]) => String((row as any)[key] || "").trim() === value.trim()));
  }
  if (type === "category") {
    const row = await prisma.categoryTranslation.findUnique({ where: { categoryId_locale: { categoryId: id, locale } } });
    return Boolean(row && Object.entries(fields).every(([key, value]) => String((row as any)[key] || "").trim() === value.trim()));
  }
  if (type === "post") {
    const row = await prisma.postTranslation.findUnique({ where: { postId_locale: { postId: id, locale } } });
    return Boolean(row && Object.entries(fields).every(([key, value]) => String((row as any)[key] || "").trim() === value.trim()));
  }
  if (type === "postCategory") {
    const row = await prisma.postCategoryTranslation.findUnique({ where: { categoryId_locale: { categoryId: id, locale } } });
    return Boolean(row && Object.entries(fields).every(([key, value]) => String((row as any)[key] || "").trim() === value.trim()));
  }
  return false;
}

async function revalidateSavedRow(type: ItemType, id: string, locale: Locale) {
  try {
    if (type === "campaign") {
      const campaign = await prisma.campaign.findUnique({
        where: { id },
        select: { slug: true, translations: { where: locale === "ar" ? undefined : { locale }, select: { slug: true }, take: 1 } },
      });
      const slug = campaign?.translations?.[0]?.slug || campaign?.slug || id;
      revalidatePath(`/${locale}/campaigns`);
      revalidatePath(`/${locale}/campaign/${slug}`);
      revalidatePath(`/ar/campaign/${campaign?.slug || id}`);
      return;
    }

    if (type === "category") {
      const category = await prisma.category.findUnique({
        where: { id },
        select: { slug: true, translations: { where: locale === "ar" ? undefined : { locale }, select: { slug: true }, take: 1 } },
      });
      const slug = category?.translations?.[0]?.slug || category?.slug || id;
      revalidatePath(`/${locale}/campaigns`);
      revalidatePath(`/${locale}/category/${slug}`);
      revalidatePath(`/ar/category/${category?.slug || id}`);
      return;
    }

    if (type === "post") {
      const post = await prisma.post.findUnique({
        where: { id },
        select: { slug: true, translations: { where: locale === "ar" ? undefined : { locale }, select: { slug: true }, take: 1 } },
      });
      const slug = post?.translations?.[0]?.slug || post?.slug || id;
      revalidatePath(`/${locale}/blog`);
      revalidatePath(`/${locale}/blog/${slug}`);
      revalidatePath(`/ar/blog/${post?.slug || id}`);
      return;
    }

    if (type === "postCategory") {
      revalidatePath(`/${locale}/blog`);
    }
  } catch (error) {
    console.warn("Content localization revalidation skipped:", error);
  }
}

async function authorize() {
  const session = await getServerSession(authOptions);
  return requireAdminOrDashboardPermission(session, "content");
}

function parseSection(value: unknown): Section | null {
  return value === "campaigns" || value === "categories" || value === "blog" ? value : null;
}

function parseLocale(value: unknown): Locale | null {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale) ? (value as Locale) : null;
}

export async function GET(request: NextRequest) {
  try {
    const denied = await authorize();
    if (denied) return denied;

    const section = parseSection(request.nextUrl.searchParams.get("section"));
    const locale = parseLocale(request.nextUrl.searchParams.get("locale"));
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 10), 25);

    if (!section) return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    if (!locale) return NextResponse.json({ error: "Invalid locale" }, { status: 400 });

    const rows = await loadPreviewRows(section, locale, limit);
    return NextResponse.json({ ok: true, section, locale, rows });
  } catch (error) {
    console.error("Content localization preview failed:", error);
    return NextResponse.json({ error: "Failed to prepare localization preview" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = await authorize();
    if (denied) return denied;

    const body = await request.json();
    const action = typeof body?.action === "string" ? body.action : "save";
    const locale = parseLocale(body?.locale);

    if (!locale) return NextResponse.json({ error: "Invalid locale" }, { status: 400 });

    if (action === "generate") {
      const section = parseSection(body?.section);
      const limit = Math.min(Number(body?.limit || 8), 10);
      if (!section) return NextResponse.json({ error: "Invalid section" }, { status: 400 });
      try {
        const rows = await generateRows(section, locale, limit);
        return NextResponse.json({ ok: true, action: "generate", section, locale, rows });
      } catch (error: any) {
        const message = error?.message || "Failed to generate professional translations";
        console.error("Professional localization generation failed:", error);
        return NextResponse.json({ error: message }, { status: message.includes("OPENAI_API_KEY") ? 412 : 500 });
      }
    }

    const rows = Array.isArray(body?.rows) ? body.rows : [];
    if (!rows.length) {
      return NextResponse.json({ error: "لا توجد نصوص جاهزة للحفظ. اكتب النص أو اضغط توليد/تدقيق احترافي أولًا." }, { status: 400 });
    }
    if (rows.length > 25) {
      return NextResponse.json({ error: "يمكن حفظ 25 عنصرًا كحد أقصى في الدفعة الواحدة." }, { status: 400 });
    }

    let saved = 0;
    let verified = 0;
    const errors: { id: string; message: string }[] = [];

    for (const row of rows) {
      const type = row?.type as ItemType;
      const id = typeof row?.id === "string" ? row.id : "";
      if (!["campaign", "category", "post", "postCategory"].includes(type) || !id) {
        errors.push({ id: id || "unknown", message: "Invalid row" });
        continue;
      }

      const fields = sanitizeFields(type, row.fields || {});
      try {
        await saveRow(type, id, locale, fields);
        const ok = await verifyRowSaved(type, id, locale, fields);
        if (!ok) throw new Error("Saved data could not be verified after writing");
        await revalidateSavedRow(type, id, locale);
        saved += 1;
        verified += 1;
      } catch (error: any) {
        errors.push({ id, message: error?.message || "Failed to save row" });
      }
    }

    return NextResponse.json({ ok: errors.length === 0, saved, verified, errors });
  } catch (error) {
    console.error("Content localization save failed:", error);
    return NextResponse.json({ error: "Failed to save localization rows" }, { status: 500 });
  }
}
