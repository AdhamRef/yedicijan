import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  convertAmountInCurrencyToUsd,
  normalizeDonationCurrencyCode,
} from "@/lib/exchange/convert-amount-in-currency-to-usd";
import { getDonorCountryCodeForSnapshot } from "@/lib/donations/donor-country-code";

/** Returns the next billing date: one month after `from`, clamped to the target month's last day. */
function getNextBillingDate(from: Date): Date {
  const next = new Date(from);
  const targetDay = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(targetDay, lastDay));
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

/** Process monthly billing: for each ACTIVE Subscription due, create a Donation (transaction) and update subscription dates */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

    const dueSubscriptions = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        nextBillingDate: { lte: todayStart },
      },
      include: {
        items: true,
        categoryItems: true,
      },
    });

    let processed = 0;
    let skipped = 0;
    let attempted = 0;
    const errors: Array<{ subscriptionId: string; reason: string }> = [];

    for (const sub of dueSubscriptions) {
      // We can only do real automatic monthly billing if we have a bank-supported token/reference transaction.
      // Never charge by storing CVV; that is not allowed.
      if (!sub.payforToken) {
        skipped++;
        continue;
      }

      attempted++;
      const transactionDate = sub.nextBillingDate || now;
      const totalAmount = sub.amount ?? 0;
      const fees = 0; // subscription template doesn't store per-charge fees; could be computed if needed
      const finalTotalAmount = totalAmount + (sub.teamSupport ?? 0) + fees;

      let donationAmountUsd = sub.amountUSD ?? 0;
      try {
        donationAmountUsd = await convertAmountInCurrencyToUsd(
          finalTotalAmount,
          normalizeDonationCurrencyCode(sub.currency)
        );
      } catch {
        /* keep subscription.template amountUSD if API fails */
      }

      const curNorm = normalizeDonationCurrencyCode(sub.currency);
      const campaignLineCreates = await Promise.all(
        sub.items.map(async (item) => ({
          campaignId: item.campaignId,
          amount: item.amount,
          amountUSD: await convertAmountInCurrencyToUsd(item.amount, curNorm),
        }))
      );
      const categoryLineCreates = await Promise.all(
        sub.categoryItems.map(async (item) => ({
          categoryId: item.categoryId,
          amount: item.amount,
          amountUSD: await convertAmountInCurrencyToUsd(item.amount, curNorm),
        }))
      );

      const donorCountrySnapshot =
        (await getDonorCountryCodeForSnapshot(prisma, sub.donorId)) ?? undefined;

      await prisma.$transaction(async (tx) => {
        // Until PayFor recurring is wired up we have nothing to actually
        // charge with, so the recurring "donation" is created already in
        // FAILED state. NEVER store status=PAID here without also setting
        // paidAt — that combo means "checkout started but unconfirmed" and
        // historically caused monthly donations to be counted as paid in
        // dashboards while never actually settling.
        await tx.donation.create({
          data: {
            amount: totalAmount,
            amountUSD: donationAmountUsd,
            totalAmount: finalTotalAmount,
            currency: sub.currency,
            teamSupport: sub.teamSupport ?? 0,
            coverFees: sub.coverFees,
            fees,
            status: "FAILED",
            provider: "PAYFOR",
            providerErrorMessage:
              "Recurring charge not implemented: bank token/reference transaction spec is required.",
            donorCountryCode: donorCountrySnapshot,
            donorId: sub.donorId,
            referralId: sub.referralId ?? undefined,
            subscriptionId: sub.id,
            paymentMethod: sub.paymentMethod,
            cardDetails: null,
            items: sub.items.length ? { create: campaignLineCreates } : undefined,
            categoryItems: sub.categoryItems.length ? { create: categoryLineCreates } : undefined,
          },
        });
        // NOTE: when the real PayFor recurring charge lands here, the success
        // branch MUST set BOTH `status: "PAID"` AND `paidAt: new Date()` so
        // reports/totals counters pick the charge up. status alone is treated
        // as "checkout started, unsettled".

        const nextBilling = getNextBillingDate(transactionDate);

        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            lastBillingDate: transactionDate,
            nextBillingDate: nextBilling,
          },
        });
      });
      processed++;
    }

    return NextResponse.json({
      ok: true,
      totalDue: dueSubscriptions.length,
      processed,
      attempted,
      skipped,
      errors,
      note:
        "Automatic PayFor recurring charges require bank token/reference transactions. Subscriptions without payforToken are skipped.",
    });
  } catch (error) {
    console.error("Monthly billing cron error:", error);
    return NextResponse.json(
      { error: "Monthly billing failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}
