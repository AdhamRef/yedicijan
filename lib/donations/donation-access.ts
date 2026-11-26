import "server-only";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { userHasDashboardPermission } from "@/lib/dashboard/permissions";

/**
 * Who may act on a donation, with the same rule as GET /api/donations/[id]:
 * a guest holds the unguessable donation id itself; a signed-in user must own
 * the donation or have revenue / donation-edit permission.
 * `token` is accepted for call-site compatibility; this site issues no
 * separate donation access tokens.
 */
export async function donationAccess(id: string, token?: string): Promise<{ allowed: boolean }> {
  void token;
  if (!/^[a-f\d]{24}$/i.test(id)) return { allowed: false };
  const row = await prisma.donation.findUnique({ where: { id }, select: { donorId: true } });
  if (!row) return { allowed: false };
  const session = await getServerSession(authOptions);
  if (!session) return { allowed: true };
  const staff = userHasDashboardPermission(session.user, "revenue") || userHasDashboardPermission(session.user, "donationsEdit");
  return { allowed: staff || session.user.id === row.donorId };
}

/** For route handlers: a 403/404 response when access is refused, or null to continue. */
export async function authorizeDonationAccess(id: string): Promise<NextResponse | null> {
  if (!/^[a-f\d]{24}$/i.test(id)) return NextResponse.json({ error: "Donation not found" }, { status: 404 });
  const { allowed } = await donationAccess(id);
  return allowed ? null : NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
