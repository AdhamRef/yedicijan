import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchEvent } from "@/lib/events/dispatch";
import { sendDonationFailedConversions } from "@/lib/tracking/donation-conversion-server";

/**
 * Mark a donation as FAILED.
 *
 * Called from the browser when a payment provider returns an inline error
 * (e.g. Stripe Elements `confirmPayment` rejects the card) so the row can't be
 * left dangling at status=PAID. Idempotent — re-marking an already-FAILED
 * donation is a no-op, and we never overwrite a donation that has already
 * been confirmed paid (paidAt is set).
 */
// Browser-reported errors are NOT authenticated provider refusals.
// Do not mutate financial state or emit tracking events from this route.
export async function PATCH() {
  return NextResponse.json({ error: "Bank confirmation required", status: "PENDING" }, { status: 409 });
}
