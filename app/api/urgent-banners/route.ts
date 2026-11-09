import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidLocale } from "@/lib/locales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public, read-only homepage banners. Never exposes disabled, expired,
 * unscheduled or untranslated banners. No database mutation or payment call.
 */
export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") || "ar";
  if (!isValidLocale(locale))
    return NextResponse.json({ error: "Unsupported locale" }, { status: 400 });
  const now = new Date();
  try {
    const rows = await prisma.urgentBanner.findMany({
      where: { isActive: true, locales: { has: locale } },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take: 50,
      include: { translations: true },
    });
    // Do not expose links to inactive/deleted projects, including after later
    // project lifecycle changes. One bounded query, not N lookups.
    const projectIds = [...new Set(rows.map((r) => r.campaignId))];
    const projects = projectIds.length
      ? await prisma.campaign.findMany({
          where: { id: { in: projectIds } },
          select: { id: true, isActive: true, isDeleted: true },
        })
      : [];
    const validProjects = new Set(
      projects.filter((p) => p.isActive && p.isDeleted !== true).map((p) => p.id),
    );
    const items = rows.flatMap((row) => {
      if (!validProjects.has(row.campaignId)) return [];
      if ((row.startsAt && row.startsAt > now) || (row.endsAt && row.endsAt <= now)) return [];
      const copy = locale === "ar" ? {
        title: row.title, description: row.description, ctaLabel: row.ctaLabel,
      } : row.translations.find((t) => t.locale === locale);
      if (!copy?.title || !copy?.ctaLabel) return [];
      return [{
        id: row.id,
        title: copy.title,
        description: copy.description || "",
        ctaLabel: copy.ctaLabel || "ساهم الآن",
        imageUrl: row.imageUrl,
        href: "/" + locale + "/campaign/" + row.campaignId,
      }];
    });
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("YediCihan urgent banner public read failed", error);
    return NextResponse.json({ items: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
