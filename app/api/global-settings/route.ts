import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import {
  parseSuggestedTeamSupport,
  validateSuggestedTeamSupportBody,
} from "@/lib/campaign/suggested-team-support";
import { Prisma } from "@prisma/client";
import { albarakaConfig, isAlbarakaConfigured } from "@/lib/albaraka";
import { auditActorFromDashboardSession, writeAuditLog } from "@/lib/audit-log";

/** Fetch the single GlobalSettings record, creating an empty one on first read. */
async function getOrCreateSettings() {
  const existing = await prisma.globalSettings.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return prisma.globalSettings.create({ data: {} });
}

/** Public GET  exposes only the donation-flow defaults clients need. */
export async function GET() {
  try {
    const settings = await prisma.globalSettings.findFirst({
      orderBy: { createdAt: "asc" },
      select: { suggestedTeamSupport: true, teamSupportEnabled: true, payforEnabled: true, allowAnyAmount: true },
    });
    const albaraka = albarakaConfig();
    return NextResponse.json({
      suggestedTeamSupport: parseSuggestedTeamSupport(settings?.suggestedTeamSupport),
      // The basket's "support the team" step; default on before any record exists.
      teamSupportEnabled: settings?.teamSupportEnabled ?? true,
      // Default true — first read before any record exists must still let
      // PayFor remain available for non-TRY donors.
      payforEnabled: settings?.payforEnabled ?? true,
      // Off: every donation line is at least $1. On: any amount, as given.
      allowAnyAmount: settings?.allowAnyAmount === true,
      // Neither flag is a secret; the checkout dialogs need them to decide whether
      // to render our own card form (Albaraka signs the card fields into the MAC,
      // so with the bank's hosted page turned on we must not collect them).
      // Both selectable modes retain our card form. 3D adds bank verification
      // after submission; the bank-hosted card-entry (OOS) page is not used.
      albarakaUseOOS: false,
      albarakaConfigured: isAlbarakaConfigured(albaraka),
    });
  } catch (e) {
    console.error("Error fetching global settings:", e);
    return NextResponse.json(
      { error: "Failed to fetch global settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT  partial update. Each field has its own permission requirement:
 *   - suggestedTeamSupport → `campaigns` perm
 *   - payforEnabled       → `generalSettings` perm
 *   - allowAnyAmount      → `generalSettings` perm
 * A single request mixing them must satisfy every matching check.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (body.teamSupportEnabled !== undefined) {
      const denied = requireAdminOrDashboardPermission(session, "campaigns");
      if (denied) return denied;
      if (typeof body.teamSupportEnabled !== "boolean") {
        return NextResponse.json({ error: "teamSupportEnabled must be a boolean" }, { status: 400 });
      }
    }
    if (body.suggestedTeamSupport !== undefined) {
      const denied = requireAdminOrDashboardPermission(session, "campaigns");
      if (denied) return denied;
    }
    if (body.payforEnabled !== undefined || body.allowAnyAmount !== undefined) {
      const denied = requireAdminOrDashboardPermission(session, "generalSettings");
      if (denied) return denied;
    }

    const updateData: Prisma.GlobalSettingsUpdateInput = {};
    if (typeof body.teamSupportEnabled === "boolean") {
      updateData.teamSupportEnabled = body.teamSupportEnabled;
    }

    if (body.suggestedTeamSupport !== undefined) {
      try {
        if (body.suggestedTeamSupport === null) {
          /* MongoDB: an optional Json column is cleared with a plain null. */
          updateData.suggestedTeamSupport = null;
        } else {
          const v = validateSuggestedTeamSupportBody(body.suggestedTeamSupport);
          if (v) {
            updateData.suggestedTeamSupport = v as unknown as Prisma.InputJsonValue;
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid suggestedTeamSupport";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    if (body.payforEnabled !== undefined) {
      if (typeof body.payforEnabled !== "boolean") {
        return NextResponse.json(
          { error: "payforEnabled must be a boolean" },
          { status: 400 }
        );
      }
      updateData.payforEnabled = body.payforEnabled;
    }

    if (body.allowAnyAmount !== undefined) {
      if (typeof body.allowAnyAmount !== "boolean") {
        return NextResponse.json({ error: "allowAnyAmount must be a boolean" }, { status: 400 });
      }
      updateData.allowAnyAmount = body.allowAnyAmount;
    }

    // Turning PayFor off sends every one-time donation to Albaraka, so refuse it
    // when Albaraka can't sign anything — that would leave no working rail at all.
    if (body.payforEnabled === false && !isAlbarakaConfigured()) {
      return NextResponse.json(
        {
          error:
            "Cannot disable PayFor: Albaraka is not configured on the server (ALBARAKA_ENC_KEY is missing), so one-time donations would have no gateway.",
        },
        { status: 400 }
      );
    }

    const existing = await getOrCreateSettings();
    const saved = await prisma.globalSettings.update({
      where: { id: existing.id },
      data: updateData,
      select: { suggestedTeamSupport: true, teamSupportEnabled: true, payforEnabled: true, allowAnyAmount: true },
    });

    // Payment settings decide where every new donation's money goes, so each
    // change is recorded with who, when, what it was, what it became and why.
    const beforePayfor = existing.payforEnabled ?? true;
    const afterPayfor = saved.payforEnabled ?? true;
    const beforeAnyAmount = existing.allowAnyAmount === true;
    const afterAnyAmount = saved.allowAnyAmount === true;
    if (session && (beforePayfor !== afterPayfor || beforeAnyAmount !== afterAnyAmount)) {
      const actor = auditActorFromDashboardSession(session);
      const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) || null : null;
      const parts: string[] = [];
      if (beforePayfor !== afterPayfor) parts.push(`PayFor ${afterPayfor ? "مفعّل" : "معطّل"} (كان ${beforePayfor ? "مفعّلًا" : "معطّلًا"})`);
      if (beforeAnyAmount !== afterAnyAmount) parts.push(`مبلغ التبرع: ${afterAnyAmount ? "أي مبلغ بعملة المتبرع" : "حد أدنى دولار واحد"}`);
      await writeAuditLog({
        ...actor,
        stream: "TEAM",
        action: "PAYMENT_GATEWAY_UPDATE",
        messageAr: `${actor.actorName ?? "مسؤول"} غيّر إعدادات الدفع: ${parts.join("، ")}${reason ? ` — السبب: ${reason}` : ""}`,
        messageEn: `${actor.actorName ?? "Admin"} changed payment settings: PayFor ${beforePayfor} → ${afterPayfor}, allow any amount ${beforeAnyAmount} → ${afterAnyAmount}`,
        entityType: "GlobalSettings",
        entityId: existing.id,
        metadata: {
          oldPayforEnabled: beforePayfor,
          newPayforEnabled: afterPayfor,
          oldAllowAnyAmount: beforeAnyAmount,
          newAllowAnyAmount: afterAnyAmount,
          reason,
        },
      });
    }

    return NextResponse.json({
      suggestedTeamSupport: parseSuggestedTeamSupport(saved.suggestedTeamSupport),
      teamSupportEnabled: saved.teamSupportEnabled,
      payforEnabled: saved.payforEnabled,
      allowAnyAmount: saved.allowAnyAmount === true,
    });
  } catch (e) {
    console.error("Error updating global settings:", e);
    return NextResponse.json(
      { error: "Failed to update global settings" },
      { status: 500 }
    );
  }
}
