import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import {
  writeAuditLog,
  auditActorFromSiteSession,
  auditStreamForRole,
} from "@/lib/audit-log";

/**
 * POST /api/donations/[id]/retry
 *
 * Clones a failed (or stuck-unsettled) donation into a fresh row the donor
 * can complete checkout for. Cloning — rather than mutating the original
 * back to "PAID + paidAt=null" — keeps an audit trail of the failed attempt,
 * lets reporting count both the failed try and the successful retry, and
 * sidesteps the various provider integrity checks that bail on
 * already-FAILED rows.
 *
 * The clone:
 *   - is owned by the same donor
 *   - copies every campaign item + category item line (same amounts in the
 *     same currency)
 *   - preserves teamSupport / coverFees / fees / totalAmount
 *   - lives in the optimistic "PAID + paidAt: null" sentinel state — exactly
 *     the same as a brand-new POST /api/donations creates
 *
 * Returns the new donation id; the caller picks the next-step URL based on
 * the original payment method.
 *
 * Auth: signed-in donor must own the donation. Guests can retry if they
 * can present the donation id (same "unguessable id = access token" model
 * the success page uses).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Donation ID required" }, { status: 400 });
    }
    const session = await getServerSession(authOptions);

    const source = await prisma.donation.findUnique({
      where: { id },
      include: { items: true, categoryItems: true },
    });
    if (!source) {
      return NextResponse.json({ error: "Donation not found" }, { status: 404 });
    }

    // Only the donor (or an admin) can retry. Guests with the link are ok too
    // — the donation id is the only secret.
    if (session && session.user.id !== source.donorId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Refuse to retry an already-paid donation — that would charge twice.
    if (source.paidAt) {
      return NextResponse.json(
        { error: "This donation has already been settled.", alreadyPaid: true },
        { status: 400 }
      );
    }

    const clone = await prisma.donation.create({
      data: {
        amount: source.amount,
        amountUSD: source.amountUSD ?? undefined,
        currency: source.currency,
        teamSupport: source.teamSupport,
        coverFees: source.coverFees,
        fees: source.fees,
        totalAmount: source.totalAmount,
        status: "PAID", // optimistic placeholder — webhook flips paidAt
        locale: source.locale ?? undefined,
        attribution: source.attribution
          ? (source.attribution as object as object)
          : undefined,
        donorCountryCode: source.donorCountryCode ?? undefined,
        donorId: source.donorId,
        referralId: source.referralId ?? undefined,
        paymentMethod: source.paymentMethod,
        cardDetails: null,
        items: source.items.length
          ? {
              create: source.items.map((it) => ({
                campaignId: it.campaignId,
                amount: it.amount,
                amountUSD: it.amountUSD ?? undefined,
                shareCount: it.shareCount ?? undefined,
              })),
            }
          : undefined,
        categoryItems: source.categoryItems.length
          ? {
              create: source.categoryItems.map((it) => ({
                categoryId: it.categoryId,
                amount: it.amount,
                amountUSD: it.amountUSD ?? undefined,
              })),
            }
          : undefined,
      },
    });

    if (session) {
      const actor = auditActorFromSiteSession(session);
      await writeAuditLog({
        ...actor,
        action: "DONATION_RETRY_CREATED",
        messageAr: `${actor.actorName ?? "متبرع"} أعاد محاولة تبرع بعد فشل (${source.id} → ${clone.id})`,
        messageEn: `${actor.actorName ?? "donor"} retried a failed donation (${source.id} → ${clone.id})`,
        entityType: "Donation",
        entityId: clone.id,
        metadata: { sourceDonationId: source.id },
        stream: auditStreamForRole(actor.actorRole),
      });
    }

    return NextResponse.json({
      id: clone.id,
      provider: source.provider ?? null,
      paymentMethod: source.paymentMethod,
      currency: source.currency,
    });
  } catch (err) {
    console.error("[donation retry] failed:", err);
    return NextResponse.json(
      { error: "Failed to create retry donation" },
      { status: 500 }
    );
  }
}
