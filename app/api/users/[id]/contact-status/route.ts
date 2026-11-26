import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * A donor's communication state, per channel, from the same fields Yedicihan's senders enforce
 * (ported from Minber al-Aqsa #275): the team sees what the donor decided before reaching out.
 * Yedicihan is opt-in: WhatsApp marketing goes only to whatsappOptIn profiles; an e-mail
 * suppression is recorded on the profile as emailOptIn=false with consentSource "elastic-email:<reason>".
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const denied = requireAdminOrDashboardPermission(session, "messages");
  if (denied) return denied;
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [user, profile] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: { email: true, phone: true } }),
    prisma.donorCommunicationProfile.findFirst({ where: { userId: id }, select: { consentSource: true, doNotContact: true, emailOptIn: true, whatsappOptIn: true, lastConsentAt: true } }),
  ]);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const source = profile?.consentSource ?? "";
  const emailReason = source.startsWith("elastic-email:") ? source.slice("elastic-email:".length) : null;
  const whatsappStopped = source === "meta-whatsapp-131050-stop";
  const undeliverable = await prisma.communicationDelivery
    .count({ where: { recipientUserId: id, channel: "WHATSAPP", status: "FAILED", errorMessage: { contains: "131026" } } })
    .catch(() => 0);
  return NextResponse.json({
    doNotContact: profile?.doNotContact === true,
    whatsapp: { hasPhone: Boolean(user.phone), optedIn: profile?.whatsappOptIn === true, stopped: whatsappStopped, at: whatsappStopped ? profile?.lastConsentAt ?? null : null, undeliverable },
    email: { hasEmail: Boolean((user.email ?? "").trim()), suppressed: profile?.emailOptIn === false && emailReason ? emailReason : null },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
