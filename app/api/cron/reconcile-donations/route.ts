import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorizationValid } from "@/lib/communication/cron-auth";
import { reconcileUnconfirmedDonations } from "@/lib/donations/reconcile-unconfirmed";
import { writeAuditLog } from "@/lib/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily clean-up of donations that never reached a confirmed payment.
 *
 * A donation row is created as `status=PAID, paidAt=null` before the donor reaches the bank's
 * 3D Secure page; only the gateway callback sets `paidAt` and increments campaign `currentAmount`.
 * Rows still unconfirmed past the stale window are abandoned carts — this marks them FAILED so
 * they stop masquerading as pending.
 *
 * `?dryRun=1` reports the same summary without writing anything.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorizationValid(request.headers.get("authorization"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";

  try {
    const summary = await reconcileUnconfirmedDonations({ dryRun });
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("reconcile-donations cron failed", error);
    await writeAuditLog({
      actorRole: "SYSTEM",
      action: "DONATIONS_RECONCILE_FAILED",
      messageAr: "فشل تشغيل مطابقة التبرعات غير المؤكدة",
      messageEn: "Donation reconciliation cron run failed",
      entityType: "Donation",
      stream: "TEAM",
    }).catch(() => {});
    return NextResponse.json({ ok: false, error: "Reconciliation failed" }, { status: 500 });
  }
}
