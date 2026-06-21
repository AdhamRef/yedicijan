// app/api/campaigns/[id]/updates/[updateId]/route.ts
// High-performance individual update operations with translations
// GET /api/campaigns/[id]/updates/[updateId] - Get specific update
// PATCH /api/campaigns/[id]/updates/[updateId] - Update an update (admin only)
// DELETE /api/campaigns/[id]/updates/[updateId] - Delete an update (admin only)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { writeAuditLog, auditActorFromDashboardSession } from "@/lib/audit-log";
import { pickTranslation, translationLocaleWhere } from "@/lib/i18n/translation-fallback";

type ParamsPromise = { params: Promise<{ id: string; updateId: string }> };

// ✅ GET - Fetch specific update with translations
export async function GET(request: NextRequest, { params }: ParamsPromise) {
  try {
    const { updateId } = await params;
    const locale = request.headers.get("x-locale") || "ar";

    const update = await prisma.update.findUnique({
      where: { id: updateId },
      select: {
        id: true,
        title: true,        // Arabic default
        description: true,  // Arabic default
        image: true,
        videoUrl: true,
        createdAt: true,
        campaignId: true,
        
        // Fetch requested locale + English (fallback chain)
        translations: {
          where: translationLocaleWhere(locale),
          select: {
            locale: true,
            title: true,
            description: true,
          },
          take: 2,
        },
      },
    });

    if (!update) {
      return NextResponse.json(
        { error: "Update not found" },
        { status: 404 }
      );
    }

    const t = pickTranslation(update.translations, locale);

    // Transform: requested locale → English → Arabic (base)
    const transformedUpdate = {
      id: update.id,
      title: t?.title || update.title,
      description: t?.description || update.description,
      image: update.image,
      videoUrl: update.videoUrl,
      campaignId: update.campaignId,
      createdAt: update.createdAt.toISOString(),
    };

    return NextResponse.json(transformedUpdate, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
    
  } catch (error) {
    console.error("Error fetching update:", error);
    return NextResponse.json(
      { error: "Failed to fetch update" },
      { status: 500 }
    );
  }
}

// ✅ PATCH - Update an update with translations (admin only)
export async function PATCH(request: NextRequest, { params }: ParamsPromise) {
  try {
    const { updateId } = await params;
    // ✅ STEP 1: Authentication check
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "campaigns");
    if (denied) return denied;
    const data = await request.json();

    // ✅ STEP 2: Validate update exists
    const existingUpdate = await prisma.update.findUnique({
      where: { id: updateId },
      select: { id: true, title: true, campaignId: true },
    });

    if (!existingUpdate) {
      return NextResponse.json(
        { error: "Update not found" },
        { status: 404 }
      );
    }

    // ✅ STEP 3: Prepare update data
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl;

    // ✅ STEP 4: Prepare translation updates
    // Expected format: { translations: { en: { title, description }, fr: {...} } }
    const translationUpdates: { locale: string; data: any }[] = [];

    if (data.translations && typeof data.translations === 'object') {
      for (const [locale, trans] of Object.entries(data.translations)) {
        if (locale !== 'ar' && trans && typeof trans === 'object') {
          const translationData: any = {};
          const t = trans as any;
          
          if (t.title !== undefined) translationData.title = t.title;
          if (t.description !== undefined) translationData.description = t.description;

          // Only add if there's data to update
          if (Object.keys(translationData).length > 0) {
            translationUpdates.push({ locale, data: translationData });
          }
        }
      }
    }

    // ✅ STEP 5: Execute update in transaction
    const updatedUpdate = await prisma.$transaction(async (tx) => {
      // Update main update fields
      const update = await tx.update.update({
        where: { id: updateId },
        data: updateData,
      });

      // Update or create translations
      for (const { locale, data: transData } of translationUpdates) {
        await tx.updateTranslation.upsert({
          where: {
            updateId_locale: {
              updateId: updateId,
              locale,
            },
          },
          update: transData,
          create: {
            updateId: updateId,
            locale,
            ...transData,
          },
        });
      }

      return update;
    });

    // ✅ STEP 6: Fetch updated update with all translations
    const fullUpdate = await prisma.update.findUnique({
      where: { id: updateId },
      select: {
        id: true,
        title: true,
        description: true,
        image: true,
        videoUrl: true,
        campaignId: true,
        createdAt: true,
        translations: {
          select: {
            locale: true,
            title: true,
            description: true,
          },
        },
      },
    });

    const actor = auditActorFromDashboardSession(session!);
    await writeAuditLog({
      ...actor,
      action: "CAMPAIGN_UPDATE_EDIT",
      messageAr: `${actor.actorName ?? "مسؤول"} عدّل تحديث المشروع: ${fullUpdate?.title ?? existingUpdate.title}`,
      entityType: "Update",
      entityId: updateId,
      metadata: { campaignId: fullUpdate?.campaignId },
    });

    return NextResponse.json(fullUpdate);
    
  } catch (error) {
    console.error("Error updating update:", error);
    return NextResponse.json(
      { error: "Failed to modify update" },
      { status: 500 }
    );
  }
}

// ✅ DELETE - Delete update and all its translations (admin only)
export async function DELETE(request: NextRequest, { params }: ParamsPromise) {
  try {
    const { updateId } = await params;
    // ✅ STEP 1: Authentication check
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "campaigns");
    if (denied) return denied;

    // ✅ STEP 2: Validate update exists
    const existingUpdate = await prisma.update.findUnique({
      where: { id: updateId },
      select: { id: true, campaignId: true, title: true },
    });

    if (!existingUpdate) {
      return NextResponse.json(
        { error: "Update not found" },
        { status: 404 }
      );
    }

    // ✅ STEP 3: Delete update (translations will cascade delete due to onDelete: Cascade)
    await prisma.update.delete({
      where: { id: updateId },
    });

    const actor = auditActorFromDashboardSession(session!);
    await writeAuditLog({
      ...actor,
      action: "CAMPAIGN_UPDATE_DELETE",
      messageAr: `${actor.actorName ?? "مسؤول"} حذف تحديثًا من المشروع: ${existingUpdate.title}`,
      entityType: "Update",
      entityId: updateId,
      metadata: { campaignId: existingUpdate.campaignId },
    });

    return NextResponse.json({ 
      success: true,
      message: "Update deleted successfully",
      campaignId: existingUpdate.campaignId,
    });
    
  } catch (error) {
    console.error("Error deleting update:", error);
    return NextResponse.json(
      { error: "Failed to delete update" },
      { status: 500 }
    );
  }
}

// ✅ Cache revalidation
export const revalidate = 300;