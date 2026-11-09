import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getServerSession } from 'next-auth';
import { authOptions } from "../auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { queueAuditLog } from "@/lib/audit-log";
import { writeErrorMessage } from "@/lib/dashboard/write-error-message";
import { CategoryCreateInputError, parseCategoryCreatePayload } from "@/lib/campaign/category-create-payload";
import { pickTranslation, translationLocaleWhere } from "@/lib/i18n/translation-fallback";
import {
  generateUniqueSlug,
  generateUniqueLocaleSlug,
} from "@/lib/slug";
import { CATEGORY_ACTIVE_OR_UNSET } from "@/lib/campaign/soft-delete-filter";

// GET: supports locale-aware translations, search, cursor pagination, optional counts, and sorting
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const cursor = params.get('cursor');
    const limit = Math.min(Number(params.get('limit')) || 100, 1000); // caps at 1000
    const locale = params.get('locale') || 'ar';
    const search = params.get('search')?.toLowerCase();
    const includeCounts = params.get('counts') === 'true';
    const activeCounts = params.get('activeCounts') === 'true';
    const sortBy = params.get('sortBy') || 'order';
    // Mirrors the campaigns pattern: default = active categories only; opt in
    // to archived rows with isActiveFalse=true (or includeInactive=true).
    const includeInactive =
      params.get('isActiveFalse') === 'true' ||
      params.get('includeInactive') === 'true';

    // Build order
    const orderBy: any = sortBy === 'name' ? { name: 'asc' } : { order: 'asc' };

    const categories = await prisma.category.findMany({
      take: limit + 1,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy,
      // Pre-existing categories may have `isActive` unset entirely (Prisma+MongoDB
      // doesn't backfill defaults on read). CATEGORY_ACTIVE_OR_UNSET is the
      // OR-of-(true/null/isSet:false) form proven to match legacy rows.
      where: includeInactive ? undefined : CATEGORY_ACTIVE_OR_UNSET,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        image: true,
        icon: true,
        order: true,
        isActive: true,
        translations: {
          where: translationLocaleWhere(locale),
          take: 2,
          select: { locale: true, name: true, description: true, slug: true }
        },
        ...(includeCounts
          ? { _count: { select: { campaigns: activeCounts ? { where: { isActive: true } } : true } } }
          : {})
      }
    });

    // Search filtering (in-memory for translated fields)
    let filtered = categories;
    if (search) {
      filtered = categories.filter(cat => {
        const t = pickTranslation(cat.translations, locale);
        const name = t?.name || cat.name || '';
        const description = t?.description || cat.description || '';
        return (
          name.toLowerCase().includes(search) ||
          description.toLowerCase().includes(search)
        );
      });
    }

    const hasMore = filtered.length > limit;
    const items = hasMore ? filtered.slice(0, -1) : filtered;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    const transformed = items.map(cat => {
      const t = pickTranslation(cat.translations, locale);
      return {
        id: cat.id,
        // Locale-aware slug surfaced for canonical URLs.
        slug: (t as { slug?: string | null } | undefined)?.slug || cat.slug || null,
        baseSlug: cat.slug ?? null,
        name: t?.name || cat.name,
        description: t?.description || cat.description,
        image: cat.image,
        icon: cat.icon,
        order: cat.order,
        isActive: cat.isActive ?? true,
        campaignCount: cat._count?.campaigns ?? undefined,
      };
    });

    return NextResponse.json({
      items: transformed,
      nextCursor,
      hasMore,
      filters: { search, locale, includeCounts, activeCounts, includeInactive, sortBy, limit }
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// Category creation: prepare locale-specific URL slugs BEFORE the transaction.
// Previously seven sequential findFirst + create calls inside Prisma's default
// 5s interactive transaction could expire on a remote Atlas cluster (P2028).
// One category write + one createMany still roll back together on any failure.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "categories");
  if (denied) return denied;

  try {
    const payload = parseCategoryCreatePayload(await request.json());
    const english = payload.translations.find((row) => row.locale === "en");
    if (!english) throw new CategoryCreateInputError("اسم التصنيف بالإنجليزية مطلوب.");

    const slug = await generateUniqueSlug(
      prisma.category as any,
      payload.requestedSlug ?? english.name,
      { fallbackPrefix: "category" }
    );

    // Parallel read-only uniqueness checks are intentionally outside the short
    // transaction. Database-enforced unique keys remain authoritative.
    const preparedTranslations = await Promise.all(
      payload.translations.map(async (t) => ({
        locale: t.locale,
        name: t.name,
        description: t.description,
        slug: await generateUniqueLocaleSlug(
          prisma.categoryTranslation as any,
          t.requestedSlug ?? t.name,
          { locale: t.locale, fallbackPrefix: "category" }
        ),
      }))
    );

    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.category.create({
        data: {
          name: payload.name,
          slug,
          description: payload.description,
          image: payload.image,
          icon: payload.icon,
          order: payload.order,
        },
      });

      if (preparedTranslations.length > 0) {
        await tx.categoryTranslation.createMany({
          data: preparedTranslations.map(({ locale, name, description, slug }) => ({
            categoryId: created.id,
            locale,
            name,
            description,
            slug,
          })),
        });
      }
      return created;
    }, { maxWait: 10_000, timeout: 20_000 });

    const full = await prisma.category.findUnique({
      where: { id: category.id },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        image: true,
        icon: true,
        order: true,
        translations: { select: { locale: true, name: true, description: true, slug: true } },
      },
    });

    queueAuditLog({
      actorId: session!.user.id,
      actorName: session!.user.name,
      actorRole: session!.user.role ?? "ADMIN",
      action: "CATEGORY_CREATE",
      messageAr: `${session!.user.name ?? "مسؤول"} أنشأ تصنيفاً جديداً: ${payload.name}`,
      entityType: "Category",
      entityId: category.id,
    });

    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    if (error instanceof CategoryCreateInputError) {
      return NextResponse.json({ error: error.message, code: "INVALID_CATEGORY" }, { status: 400 });
    }

    // Do not expose raw MongoDB / Prisma exception details to the browser.
    console.error("Error creating category:", error);
    const code = error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code) : "";
    const status = code === "P2002" ? 409
      : ["P2028", "P2034", "P1001", "P1002", "P1017"].includes(code) ? 503
      : 500;
    return NextResponse.json(
      { error: writeErrorMessage(error, "تعذّر إنشاء التصنيف. تحقق من القائمة قبل إعادة المحاولة."), code: code || "CATEGORY_SAVE_FAILED" },
      { status }
    );
  }
}
