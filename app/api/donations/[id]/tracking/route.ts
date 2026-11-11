import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { metaDonationEventId } from "@/lib/tracking/canonical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Single source of truth for what this route loads. The helpers below are typed from THIS
 * object, so if a field is ever dropped from the query the helper that reads it stops
 * compiling — previously they were typed as a bare `findUnique` payload (no relations), which
 * made `row.donor` a type error and, more importantly, meant the types could not have caught
 * an actually-missing include.
 */
const donationTrackingInclude = {
  items: { include: { campaign: { select: { id: true, title: true } } } },
  categoryItems: { include: { category: { select: { id: true, name: true } } } },
} satisfies Prisma.DonationInclude;

type DonationTrackingRow = Prisma.DonationGetPayload<{
  include: typeof donationTrackingInclude;
}>;

interface TrackingContent {
  id: string;
  quantity: number;
  item_price: number;
}

interface TrackingResponseOk {
  ok: true;
  eventName: "Donate";
  eventId: string;
  transactionId: string;
  orderId: string;
  value: number;
  currency: string;
  contentType: "donation";
  contentIds: string[];
  contentName: string;
  contentCategory: string;
  contents: TrackingContent[];
  numItems: number;
  status: "paid";
  success: true;
  paymentInfoAvailable: true;
  donationType: "ONE_TIME" | "MONTHLY";
  paymentMethod: string;
}

interface TrackingResponseFail {
  ok: false;
  reason: string;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json<TrackingResponseFail>({ ok: false, reason: "missing donation id" }, { status: 400 });
  }

  const row = await prisma.donation.findUnique({
    where: { id },
    include: donationTrackingInclude,
  });

  if (!row) {
    return NextResponse.json<TrackingResponseFail>({ ok: false, reason: "not found" }, { status: 404 });
  }

  if (row.status !== "PAID") {
    return NextResponse.json<TrackingResponseFail>({ ok: false, reason: `not paid (status=${row.status})` }, { status: 200 });
  }
  if (row.paidAt == null) {
    return NextResponse.json<TrackingResponseFail>({ ok: false, reason: "paidAt unset" }, { status: 200 });
  }

  const value = paidDonationValue(row);
  if (!(value > 0)) {
    return NextResponse.json<TrackingResponseFail>({ ok: false, reason: "amount <= 0" }, { status: 200 });
  }

  const contents: TrackingContent[] = [];
  const contentIds: string[] = [];
  let primaryName: string | undefined;

  for (const it of row.items) {
    contents.push({ id: it.campaignId, quantity: 1, item_price: it.amount });
    contentIds.push(it.campaignId);
    if (!primaryName && it.campaign?.title) primaryName = it.campaign.title;
  }
  for (const ci of row.categoryItems) {
    contents.push({ id: ci.categoryId, quantity: 1, item_price: ci.amount });
    contentIds.push(ci.categoryId);
    if (!primaryName && ci.category?.name) primaryName = ci.category.name;
  }
  if (row.teamSupport > 0) {
    contents.push({ id: "team_support", quantity: 1, item_price: row.teamSupport });
    contentIds.push("team_support");
  }
  if (row.fees > 0) {
    contents.push({ id: "covered_fees", quantity: 1, item_price: row.fees });
    contentIds.push("covered_fees");
  }
  if (contents.length === 0) {
    contents.push({ id: "donation", quantity: 1, item_price: value });
    contentIds.push("donation");
  }

  const isMonthly = !!row.subscriptionId;

  const payload: TrackingResponseOk = {
    ok: true,
    eventName: "Donate",
    eventId: metaDonationEventId(row.id, "success"),
    transactionId: row.id,
    orderId: row.id,
    value,
    currency: row.currency || "USD",
    contentType: "donation",
    contentIds,
    contentName: primaryName ?? "Donation",
    contentCategory: isMonthly ? "monthly" : "donation",
    contents,
    numItems: contents.reduce((s, c) => s + c.quantity, 0),
    status: "paid",
    success: true,
    paymentInfoAvailable: true,
    donationType: isMonthly ? "MONTHLY" : "ONE_TIME",
    paymentMethod: (row.paymentMethod ?? "CARD").toLowerCase(),
  };

  return NextResponse.json<TrackingResponseOk>(payload, {
    status: 200,
    headers: { "Cache-Control": "private, max-age=300" },
  });
}
