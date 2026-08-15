import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import {
  contentLocalizationPermissionForSection,
  parseContentLocalizationSection,
  type ContentLocalizationSection,
} from "@/lib/content-localization/access";
import { prisma } from "@/lib/prisma";

const TRANSLATION_LOCALES = ["en", "fr", "tr", "id", "pt", "es", "de"] as const;
const SUPPORTED_LOCALES = ["ar", ...TRANSLATION_LOCALES] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];
type TranslationLocale = (typeof TRANSLATION_LOCALES)[number];
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

function parseLocale(value: unknown): Locale | null {
  return typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
    ? (value as Locale)
    : null;
}

function isTranslationLocale(locale: Locale): locale is TranslationLocale {
  return locale !== "ar" &&
    (TRANSLATION_LOCALES as readonly string[]).includes(locale);
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function makeRow(input: {
  id: string;
  type: ItemType;
  label: string;
  typeLabel: string;
  locale: Locale;
  sourceArabic: Record<string, string | null>;
  fields: string[];
  translation?: Record<string, unknown> | null;
}): PreviewRow | null {
  const currentTranslation: Record<string, string | null> = {};
  const suggestedTranslation: Record<string, string> = {};
  const missingFields: string[] = [];
  const emptyFields: string[] = [];
  const identicalToArabicFields: string[] = [];

  for (const field of input.fields) {
    const source = normalizeText(input.sourceArabic[field]);
    const current = input.locale === "ar"
      ? source
      : normalizeText(input.translation?.[field]);
    currentTranslation[field] = current || null;
    suggestedTranslation[field] = current;

    if (input.locale !== "ar") {
      if (!input.translation || !(field in input.translation)) missingFields.push(field);
      else if (!current) emptyFields.push(field);
      else if (source && source === current) identicalToArabicFields.push(field);
    } else if (!current) {
      emptyFields.push(field);
    }
  }

  if (
    input.locale !== "ar" &&
    missingFields.length === 0 &&
    emptyFields.length === 0 &&
    identicalToArabicFields.length === 0
  ) {
    return null;
  }

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

async function loadPreviewRows(
  section: ContentLocalizationSection,
  locale: Locale,
  limit: number,
): Promise<PreviewRow[]> {
  if (section === "campaigns") {
    const rows = await prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { translations: true },
      take: 200,
    });
    return rows
      .map((item) => makeRow({
        id: item.id,
        type: "campaign",
        label: item.title || "بدون عنوان",
        typeLabel: "مشروع",
        locale,
        fields: ["title", "description"],
        sourceArabic: { title: item.title, description: item.description },
        translation: locale === "ar"
          ? null
          : item.translations.find((row) => row.locale === locale),
      }))
      .filter((row): row is PreviewRow => Boolean(row))
      .slice(0, limit);
  }

  if (section === "categories") {
    const rows = await prisma.category.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: { translations: true },
      take: 200,
    });
    return rows
      .map((item) => makeRow({
        id: item.id,
        type: "category",
        label: item.name || "بدون اسم",
        typeLabel: "حملة / تصنيف",
        locale,
        fields: ["name", "description"],
        sourceArabic: { name: item.name, description: item.description },
        translation: locale === "ar"
          ? null
          : item.translations.find((row) => row.locale === locale),
      }))
      .filter((row): row is PreviewRow => Boolean(row))
      .slice(0, limit);
  }

  const [posts, postCategories] = await Promise.all([
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: { translations: true },
      take: 200,
    }),
    prisma.postCategory.findMany({
      orderBy: { createdAt: "desc" },
      include: { translations: true },
      take: 200,
    }),
  ]);

  return [
    ...posts.map((item) => makeRow({
      id: item.id,
      type: "post",
      label: item.title || "بدون عنوان",
      typeLabel: "مقال",
      locale,
      fields: ["title", "description", "content"],
      sourceArabic: {
        title: item.title,
        description: item.description,
        content: item.content,
      },
      translation: locale === "ar"
        ? null
        : item.translations.find((row) => row.locale === locale),
    })),
    ...postCategories.map((item) => makeRow({
      id: item.id,
      type: "postCategory",
      label: item.name || "بدون اسم",
      typeLabel: "تصنيف مدونة",
      locale,
      fields: ["name", "title", "description"],
      sourceArabic: {
        name: item.name,
        title: item.title,
        description: item.description,
      },
      translation: locale === "ar"
        ? null
        : item.translations.find((row) => row.locale === locale),
    })),
  ]
    .filter((row): row is PreviewRow => Boolean(row))
    .slice(0, limit);
}

function compactText(value: string | null | undefined, max = 9000): string {
  const trimmed = value?.trim() || "";
  return trimmed.length > max
    ? `${trimmed.slice(0, max)}\n...[trimmed for review]`
    : trimmed;
}

function stripCodeFence(value: string): string {
  return value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

async function generateProfessionalTranslation(
  row: PreviewRow,
  locale: Locale,
): Promise<PreviewRow> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const fields = Object.keys(row.sourceArabic);
  const sourceArabic = Object.fromEntries(
    fields.map((field) => [field, compactText(row.sourceArabic[field])]),
  );
  const currentTranslation = Object.fromEntries(
    fields.map((field) => [field, compactText(row.currentTranslation[field])]),
  );
  const task = locale === "ar"
    ? "Proofread the Arabic fields for preview only. Preserve every fact, number, name, URL, placeholder, and currency."
    : "Translate the Arabic fields into the target language for preview only. Preserve every fact, number, name, URL, placeholder, and currency.";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.CONTENT_LOCALIZATION_MODEL || "gpt-4o-mini",
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Return valid JSON only. Never fabricate details. This is a preview and must not imply that content was saved.",
        },
        {
          role: "user",
          content: [
            task,
            `Target language: ${LOCALE_NAMES[locale]} (${locale}).`,
            "Return: {\"fields\":{...},\"qualityNotes\":[\"...\"]}",
            `Item type: ${row.typeLabel}`,
            `Arabic source JSON: ${JSON.stringify(sourceArabic)}`,
            `Current text JSON: ${JSON.stringify(currentTranslation)}`,
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`AI translation failed: ${response.status} ${details.slice(0, 300)}`);
  }

  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content;
  if (typeof raw !== "string" || !raw) {
    throw new Error("AI translation returned no content");
  }
  const parsed = JSON.parse(stripCodeFence(raw));
  const generated = parsed?.fields && typeof parsed.fields === "object"
    ? parsed.fields
    : {};
  const suggestedTranslation = { ...row.suggestedTranslation };
  for (const field of fields) {
    const value = generated[field];
    if (typeof value === "string") suggestedTranslation[field] = value.trim();
  }

  return {
    ...row,
    suggestedTranslation,
    qualityNotes: Array.isArray(parsed?.qualityNotes)
      ? parsed.qualityNotes.filter((value: unknown) => typeof value === "string")
      : [],
  };
}

async function authorize(section: ContentLocalizationSection) {
  const session = await getServerSession(authOptions);
  return requireAdminOrDashboardPermission(
    session,
    contentLocalizationPermissionForSection(section),
  );
}

export async function GET(request: NextRequest) {
  try {
    const section = parseContentLocalizationSection(
      request.nextUrl.searchParams.get("section"),
    );
    const locale = parseLocale(request.nextUrl.searchParams.get("locale"));
    if (!section) return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    if (!locale) return NextResponse.json({ error: "Invalid locale" }, { status: 400 });

    const denied = await authorize(section);
    if (denied) return denied;

    const limit = Math.min(
      Math.max(Number(request.nextUrl.searchParams.get("limit") || 10), 1),
      25,
    );
    const rows = await loadPreviewRows(section, locale, limit);
    return NextResponse.json({ ok: true, readOnly: true, section, locale, rows });
  } catch (error) {
    console.error("Content localization preview failed:", error);
    return NextResponse.json(
      { error: "Failed to prepare localization preview" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const section = parseContentLocalizationSection(body?.section);
    const locale = parseLocale(body?.locale);
    if (!section) return NextResponse.json({ error: "Invalid section" }, { status: 400 });
    if (!locale) return NextResponse.json({ error: "Invalid locale" }, { status: 400 });

    const denied = await authorize(section);
    if (denied) return denied;

    if (body?.action !== "generate") {
      return NextResponse.json(
        {
          ok: false,
          readOnly: true,
          error:
            "Localization apply is temporarily disabled pending Preview -> Review -> Approve -> Apply -> Rollback workflow.",
        },
        { status: 409 },
      );
    }

    const limit = Math.min(Math.max(Number(body?.limit || 8), 1), 10);
    const sourceRows = await loadPreviewRows(section, locale, limit);
    const rows: PreviewRow[] = [];
    for (const row of sourceRows) {
      rows.push(await generateProfessionalTranslation(row, locale));
    }
    return NextResponse.json({
      ok: true,
      readOnly: true,
      action: "generate",
      section,
      locale,
      rows,
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Failed to generate localization preview";
    console.error("Content localization preview generation failed:", error);
    return NextResponse.json(
      { error: message },
      { status: message.includes("OPENAI_API_KEY") ? 412 : 500 },
    );
  }
}
