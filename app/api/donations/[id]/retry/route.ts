import { donationAccessLevel, isDonationId } from "@/lib/donations/guest-access";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";

/**
 * P0 SAFE HOLD: The bank's state cannot be inferred from null paidAt or a
 * browser-reported FAILED value. A retry would create a second charge path
 * while the original could still settle. Until a provider-specific server
 * inquiry attests the final state and a unique retry key is persisted, do not
 * clone donations or change provider references. This applies to all actors.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDonationId(id)) {
    return NextResponse.json({ error: "Invalid donation ID" }, { status: 400 });
  }
  const session = await getServerSession(authOptions);
  const source = await prisma.donation.findUnique({
    where: { id },
    select: {
      id: true, donorId: true, createdAt: true, totalAmount: true, currency: true,
      paidAt: true, status: true, provider: true, providerOrderId: true,
    },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = donationAccessLevel(req, session, source);
  if (access !== "owner" && access !== "guest") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (source.status === "PAID" && source.paidAt) {
    return NextResponse.json({
      code: "ALREADY_SETTLED", error: "Payment has already been confirmed",
    }, { status: 409, headers: { "Cache-Control": "private, no-store" } });
  }
  return NextResponse.json({
    code: "RETRY_AWAITING_BANK_VERIFICATION",
    error: "The original payment may still settle; retry is disabled until verified bank reconciliation",
  }, { status: 409, headers: { "Cache-Control": "private, no-store" } });
}
