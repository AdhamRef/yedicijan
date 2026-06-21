// One-shot backfill: assigns a unique slug to every Campaign, Category, Post,
// and PostCategory row that doesn't already have one; and a per-locale slug on
// every CampaignTranslation that is missing one.
//
// Slug source priority (base models):
//   Campaign: Arabic (main) title first, then English translation title.
//   Category, Post, PostCategory: English translation, then base (Arabic) field.
//
// CampaignTranslation slug source priority:
//   1. That row's title
//   2. Parent campaign's English translation title
//   3. Parent campaign Arabic title
//   4. Parent campaign base slug
//
// Safe to re-run — only touches translation rows with no usable slug.
//
// Note (MongoDB): documents may omit `slug` entirely; Prisma filters like
// `{ slug: null }` often do NOT match omitted fields, so we scan all
// CampaignTranslation rows and treat missing/blank slugs in application code.
//
// Run with:  npx tsx prisma/backfill-slugs.ts

import { PrismaClient } from "@prisma/client";
import { generateUniqueSlug, generateUniqueLocaleSlug } from "../lib/slug";

const prisma = new PrismaClient();

async function backfillCampaigns() {
  const rows = await prisma.campaign.findMany({
    where: { slug: null },
    select: {
      id: true,
      title: true,
      translations: {
        where: { locale: "en" },
        select: { title: true },
        take: 1,
      },
    },
  });
  if (rows.length === 0) {
    console.log("[Campaign] nothing to backfill.");
    return;
  }
  for (const row of rows) {
    const enTitle = row.translations[0]?.title?.trim();
    const base = row.title?.trim() || enTitle || "";
    const slug = await generateUniqueSlug(prisma.campaign as any, base, {
      fallbackPrefix: "campaign",
      currentId: row.id,
    });
    await prisma.campaign.update({ where: { id: row.id }, data: { slug } });
  }
  console.log(`[Campaign] backfilled ${rows.length} row(s).`);
}

function translationSlugIsMissing(slug: string | null | undefined): boolean {
  if (slug == null) return true;
  return String(slug).trim() === "";
}

async function backfillCampaignTranslationSlugs() {
  const allRows = await prisma.campaignTranslation.findMany({
    select: {
      id: true,
      locale: true,
      title: true,
      slug: true,
      campaign: {
        select: {
          title: true,
          slug: true,
          translations: {
            where: { locale: "en" },
            select: { title: true },
            take: 1,
          },
        },
      },
    },
  });

  const rows = allRows.filter((r) => translationSlugIsMissing(r.slug));
  console.log(
    `[CampaignTranslation] scanned ${allRows.length} row(s); ${rows.length} need a slug.`
  );

  if (rows.length === 0) {
    console.log("[CampaignTranslation] nothing to backfill.");
    return;
  }

  for (const row of rows) {
    const c = row.campaign;
    const enTitle = c.translations[0]?.title?.trim();
    // Prefer this locale’s title → slug; then fallbacks if title is empty.
    const base =
      row.title?.trim() ||
      enTitle ||
      c.title?.trim() ||
      c.slug?.trim() ||
      "";
    const slug = await generateUniqueLocaleSlug(prisma.campaignTranslation as any, base, {
      locale: row.locale,
      fallbackPrefix: "campaign",
      currentTranslationId: row.id,
    });
    await prisma.campaignTranslation.update({
      where: { id: row.id },
      data: { slug },
    });
  }
  console.log(`[CampaignTranslation] backfilled ${rows.length} row(s).`);
}

async function backfillCategories() {
  const rows = await prisma.category.findMany({
    where: { slug: null },
    select: {
      id: true,
      name: true,
      translations: {
        where: { locale: "en" },
        select: { name: true },
        take: 1,
      },
    },
  });
  if (rows.length === 0) {
    console.log("[Category] nothing to backfill.");
    return;
  }
  for (const row of rows) {
    const enName = row.translations[0]?.name?.trim();
    const base = enName || row.name || "";
    const slug = await generateUniqueSlug(prisma.category as any, base, {
      fallbackPrefix: "category",
      currentId: row.id,
    });
    await prisma.category.update({ where: { id: row.id }, data: { slug } });
  }
  console.log(`[Category] backfilled ${rows.length} row(s).`);
}

async function backfillPosts() {
  const rows = await prisma.post.findMany({
    where: { slug: null },
    select: {
      id: true,
      title: true,
      translations: {
        where: { locale: "en" },
        select: { title: true },
        take: 1,
      },
    },
  });
  if (rows.length === 0) {
    console.log("[Post] nothing to backfill.");
    return;
  }
  for (const row of rows) {
    const enTitle = row.translations[0]?.title?.trim();
    const base = enTitle || row.title || "";
    const slug = await generateUniqueSlug(prisma.post as any, base, {
      fallbackPrefix: "post",
      currentId: row.id,
    });
    await prisma.post.update({ where: { id: row.id }, data: { slug } });
  }
  console.log(`[Post] backfilled ${rows.length} row(s).`);
}

async function backfillPostCategories() {
  const rows = await prisma.postCategory.findMany({
    where: { slug: null },
    select: {
      id: true,
      name: true,
      translations: {
        where: { locale: "en" },
        select: { name: true },
        take: 1,
      },
    },
  });
  if (rows.length === 0) {
    console.log("[PostCategory] nothing to backfill.");
    return;
  }
  for (const row of rows) {
    const enName = row.translations[0]?.name?.trim();
    const base = enName || row.name || "";
    const slug = await generateUniqueSlug(prisma.postCategory as any, base, {
      fallbackPrefix: "blog-category",
      currentId: row.id,
    });
    await prisma.postCategory.update({ where: { id: row.id }, data: { slug } });
  }
  console.log(`[PostCategory] backfilled ${rows.length} row(s).`);
}

async function main() {
  await backfillCampaigns();
  await backfillCampaignTranslationSlugs();
  await backfillCategories();
  await backfillPosts();
  await backfillPostCategories();
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
