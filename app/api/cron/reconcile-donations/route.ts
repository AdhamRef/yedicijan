import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorizationValid } from "@/lib/communication/cron-auth";
import { reconcileUnconfirmedDonations } from "@/lib/donations/reconcile-unconfirmed";
import { writeAuditLog } from "@/lib/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Half-hour confirmation polling for online donations. Provider uncertainty
 * stays distinguishable from an authoritative unpaid result after 24 hours.
 *
 * The existing provider settlement owns paidAt and revenue. Albaraka rows are asked
 * of the bank and reuse that settlement; PayFor has no status lookup, so its abandoned
 * carts are aged out after 48 hours. For Albaraka,
 * age by itself is never proof that an unknown bank response means unpaid.
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

    // Recovered money is the whole point of the job  make it loud rather than leaving it in a
    // response body nobody reads.
    if (summary.credited.length > 0 && !dryRun) {
      await writeAuditLog({
        actorRole: "SYSTEM",
        action: "DONATIONS_RECONCILED_FROM_PROVIDERS",
        messageAr: `تم اعتماد ${summary.credited.length} تبرع مؤكد لدى بوابة الدفع لم يصل إشعارها (${summary.creditedTotalUSD.toFixed(2)} دولار)`,
        messageEn: `Credited ${summary.credited.length} donation(s) confirmed paid by their provider whose confirmation never arrived ($${summary.creditedTotalUSD.toFixed(2)})`,
        entityType: "Donation",
        metadata: { externalCall: true, donationIds: summary.credited.map((c) => c.donationId) },
        stream: "TEAM",
      }).catch(() => {});
    }

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
