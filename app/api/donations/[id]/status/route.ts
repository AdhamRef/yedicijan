import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { donationAccessLevel, isDonationId } from "@/lib/donations/guest-access";

/** Read-only, minimum-purpose payment status for a verified donor or guest. */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!isDonationId(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  const session = await getServerSession(authOptions);
  const row = await prisma.donation.findUnique({
    where: { id },
    select: {
      id: true, donorId: true, createdAt: true, totalAmount: true, currency: true,
      status: true, paidAt: true,
    },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!donationAccessLevel(req, session, row)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    status: row.status === "FAILED" ? "FAILED" :
      row.status === "PAID" && row.paidAt ? "PAID" : "PENDING",
    // Do not include any donor, amount, provider, reference or internal fields.
    paidAt: row.paidAt ?? null,
  }, { headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
}
