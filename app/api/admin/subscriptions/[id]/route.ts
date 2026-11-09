import { NextRequest, NextResponse } from "next/server";
import { SubscriptionStatus } from "@prisma/client";
import Stripe from "stripe";
import { verifiedStripeSubscriptionState } from "@/lib/finance/stripe-subscription-authority";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import {
  writeAuditLog,
  auditActorFromDashboardSession,
} from "@/lib/audit-log";

/** PATCH /api/admin/subscriptions/[id] — set status (ACTIVE | PAUSED | CANCELLED); dashboard monthly permission */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "monthly");
    if (denied) return denied;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Subscription id required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const status = body?.status as string | undefined;

    if (!["ACTIVE", "PAUSED", "CANCELLED"].includes(String(status))) {
      return NextResponse.json(
        { error: "Invalid status; use ACTIVE, PAUSED or CANCELLED" },
        { status: 400 }
      );
    }

    const sub = await prisma.subscription.findUnique({
      where: { id },
      select: { id: true, status: true, payforToken: true },
    });

    if (!sub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // The admin endpoint is a provider state reconciliation, NOT a Stripe
    // cancellation/resumption operation. Reject unconfirmed local transitions.
    const requestedStatus = status as SubscriptionStatus;
    if (!sub.payforToken || !/^sub_[A-Za-z0-9]+$/.test(sub.payforToken)) {
      return NextResponse.json({ error: "لا يمكن تحديث اشتراك دون معرّف Stripe مؤكد" }, { status: 409 });
    }
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return NextResponse.json({ error: "Stripe غير مهيأ" }, { status: 503 });
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });
    const provider = await stripe.subscriptions.retrieve(sub.payforToken);
    const paidFirst = await prisma.donation.findFirst({
      where: { subscriptionId: sub.id, status: "PAID", paidAt: { not: null } },
      select: { id: true },
    });
    let verified;
    try {
      verified = verifiedStripeSubscriptionState(provider, Boolean(paidFirst));
    } catch (e) {
      return NextResponse.json({
        error: "الحالة لدى Stripe غير مؤهلة للتفعيل أو موعد التجديد غير مؤكد",
        reason: e instanceof Error ? e.message : "UNKNOWN_PROVIDER_STATE",
      }, { status: 409 });
    }
    if (verified.status !== requestedStatus) {
      return NextResponse.json({
        error: "يجب تنفيذ الإلغاء أو الإيقاف أو إعادة التفعيل لدى Stripe أولًا",
        providerStatus: verified.status,
      }, { status: 409 });
    }
    // Only mirror an already verified provider state; never create a local
    // activation or fabricate its billing date.
    await prisma.subscription.update({
      where: { id },
      data: { status: verified.status, nextBillingDate: verified.nextBillingDate },
    });
    const nextStatus = verified.status;

    const actor = auditActorFromDashboardSession(session!);
    await writeAuditLog({
      ...actor,
      action: "SUBSCRIPTION_UPDATE",
      messageAr: `${actor.actorName ?? "مسؤول"} غيّر حالة الاشتراك إلى ${nextStatus}`,
      messageEn: `${actor.actorName ?? "Admin"} set subscription status to ${nextStatus}`,
      entityType: "Subscription",
      entityId: id,
      metadata: { status: nextStatus },
      stream: "TEAM",
    });

    const row = await prisma.subscription.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        amount: true,
        amountUSD: true,
        currency: true,
        createdAt: true,
        nextBillingDate: true,
        lastBillingDate: true,
        donor: { select: { id: true, name: true, email: true } },
        items: { select: { campaign: { select: { id: true, title: true } } } },
        categoryItems: { select: { category: { select: { id: true, name: true } } } },
      },
    });

    if (!row) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const payload = {
      id: row.id,
      status: row.status,
      amount: row.amount,
      amountUSD: row.amountUSD,
      currency: row.currency,
      createdAt: row.createdAt,
      nextBillingDate: row.nextBillingDate,
      lastBillingDate: row.lastBillingDate,
      donor: row.donor,
      campaigns: row.items.map((i) => ({ id: i.campaign.id, title: i.campaign.title })),
      categories: row.categoryItems.map((c) => ({
        id: c.category.id,
        name: c.category.name,
      })),
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      {
        error: "Failed to update subscription",
        details: "تعذر مزامنة الحالة من مزود الدفع",
      },
      { status: 500 }
    );
  }
}
