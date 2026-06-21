import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";

type Section = "campaigns" | "categories" | "blog";
type ItemType = "campaign" | "category" | "post" | "postCategory";

type ArabicProofreadItem = {
  id: string;
  type: ItemType;
  label: string;
  fields: Record<string, string | null>;
};

function parseSection(value: unknown): Section | null {
  return value === "campaigns" || value === "categories" || value === "blog" ? value : null;
}

function compactText(value: string | null | undefined, max = 9000) {
  if (!value) return "";
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}\n...[trimmed for review]` : trimmed;
}

function stripCodeFence(value: string) {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
}

function sanitizeGeneratedFields(original: Record<string, string | null>, generated: Record<string, unknown>) {
  const output: Record<string, string> = {};
  for (const field of Object.keys(original)) {
    const next = generated[field];
    const oldValue = original[field];
    if (typeof next === "string" && next.trim()) output[field] = next.trim();
    else if (typeof oldValue === "string" && oldValue.trim()) output[field] = oldValue.trim();
  }
  return output;
}

async function loadItems(section: Section, offset: number, limit: number): Promise<{ total: number; items: ArabicProofreadItem[] }> {
  if (section === "campaigns") {
    const [total, rows] = await Promise.all([
      prisma.campaign.count(),
      prisma.campaign.findMany({ orderBy: { createdAt: "desc" }, skip: offset, take: limit }),
    ]);
    return {
      total,
      items: rows.map((item: any) => ({
        id: item.id,
        type: "campaign",
        label: item.title || "بدون عنوان",
        fields: { title: item.title ?? null, description: item.description ?? null },
      })),
    };
  }

  if (section === "categories") {
    const [total, rows] = await Promise.all([
      prisma.category.count(),
      prisma.category.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], skip: offset, take: limit }),
    ]);
    return {
      total,
      items: rows.map((item: any) => ({
        id: item.id,
        type: "category",
        label: item.name || "بدون اسم",
        fields: { name: item.name ?? null, description: item.description ?? null },
      })),
    };
  }

  const [posts, postCategories] = await Promise.all([
    prisma.post.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.postCategory.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const all: ArabicProofreadItem[] = [
    ...posts.map((item: any) => ({
      id: item.id,
      type: "post" as ItemType,
      label: item.title || "بدون عنوان",
      fields: { title: item.title ?? null, description: item.description ?? null, content: item.content ?? null },
    })),
    ...postCategories.map((item: any) => ({
      id: item.id,
      type: "postCategory" as ItemType,
      label: item.name || "بدون اسم",
      fields: { name: item.name ?? null, title: item.title ?? null, description: item.description ?? null },
    })),
  ];

  return { total: all.length, items: all.slice(offset, offset + limit) };
}

async function proofreadArabic(item: ArabicProofreadItem) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const source = Object.fromEntries(
    Object.entries(item.fields).map(([field, value]) => [field, compactText(value)]),
  );

  const prompt = [
    "You are a senior Arabic editor and humanitarian fundraising copywriter.",
    "Proofread and polish the Arabic fields in clear Modern Standard Arabic.",
    "Correct spelling, hamza forms, grammar, punctuation, agreement, flow, and awkward phrasing.",
    "Keep the tone warm, humane, trustworthy, and suitable for donation campaigns.",
    "Preserve all facts, amounts, dates, locations, names, URLs, placeholders, and currency symbols exactly.",
    "Do not add new promises, beneficiaries, claims, numbers, medical details, locations, or religious texts.",
    "If a field is empty, return an empty string for that key.",
    "Return strict JSON only with this shape: {\"fields\":{...},\"qualityNotes\":[\"...\"]}",
    `Item type: ${item.type}`,
    `Arabic source JSON: ${JSON.stringify(source)}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.CONTENT_LOCALIZATION_MODEL || "gpt-4o-mini",
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return valid JSON only. Never fabricate facts. Preserve all numbers, names, URLs, and placeholders." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`AI Arabic proofreading failed: ${response.status} ${details.slice(0, 300)}`);
  }

  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content;
  if (!raw || typeof raw !== "string") throw new Error("AI Arabic proofreading returned no content");

  const parsed = JSON.parse(stripCodeFence(raw));
  const generated = parsed?.fields && typeof parsed.fields === "object" ? parsed.fields : {};
  return sanitizeGeneratedFields(item.fields, generated);
}

async function saveArabicItem(item: ArabicProofreadItem, fields: Record<string, string>) {
  if (item.type === "campaign") {
    await prisma.campaign.update({
      where: { id: item.id },
      data: {
        ...(fields.title ? { title: fields.title } : {}),
        ...(fields.description ? { description: fields.description } : {}),
      },
    });
    return;
  }

  if (item.type === "category") {
    await prisma.category.update({
      where: { id: item.id },
      data: {
        ...(fields.name ? { name: fields.name } : {}),
        ...(fields.description ? { description: fields.description } : {}),
      },
    });
    return;
  }

  if (item.type === "post") {
    await prisma.post.update({
      where: { id: item.id },
      data: {
        ...(fields.title ? { title: fields.title } : {}),
        ...(fields.description ? { description: fields.description } : {}),
        ...(fields.content ? { content: fields.content } : {}),
      },
    });
    return;
  }

  if (item.type === "postCategory") {
    await prisma.postCategory.update({
      where: { id: item.id },
      data: {
        ...(fields.name ? { name: fields.name } : {}),
        ...(fields.title ? { title: fields.title } : {}),
        ...(fields.description ? { description: fields.description } : {}),
      },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "content");
    if (denied) return denied;

    const body = await request.json();
    const section = parseSection(body?.section);
    const offset = Math.max(0, Number(body?.offset || 0));
    const limit = Math.min(Math.max(1, Number(body?.limit || 5)), 10);

    if (!section) return NextResponse.json({ error: "Invalid section" }, { status: 400 });

    const { total, items } = await loadItems(section, offset, limit);
    let processed = 0;
    const errors: { id: string; label: string; message: string }[] = [];

    for (const item of items) {
      try {
        const fields = await proofreadArabic(item);
        await saveArabicItem(item, fields);
        processed += 1;
      } catch (error: any) {
        errors.push({ id: item.id, label: item.label, message: error?.message || "Failed to proofread item" });
      }
    }

    const nextOffset = offset + items.length;
    return NextResponse.json({
      ok: true,
      section,
      offset,
      nextOffset,
      limit,
      total,
      processed,
      errors,
      hasMore: nextOffset < total,
    });
  } catch (error) {
    console.error("Bulk Arabic proofreading failed:", error);
    return NextResponse.json({ error: "Failed to run bulk Arabic proofreading" }, { status: 500 });
  }
}
