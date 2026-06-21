/**
 * One-time backfill for monthly donations stuck at status=PAID, paidAt=null.
 *
 * Cause: the Stripe webhook used the legacy `invoice.subscription` field, which
 * was removed in API 2024-09-30. With apiVersion "2026-03-25.dahlia" the field
 * is undefined, so the invoice.payment_succeeded handler exited before writing
 * paidAt and incrementing campaign/category totals. The webhook is now fixed —
 * this script catches up the historical rows.
 *
 * For each stuck donation we look up the matching Stripe invoice. If Stripe
 * says it's paid, we set paidAt + run the campaign/category increments the
 * webhook should have done. If Stripe says it's void/uncollectible, we flip
 * the donation to FAILED. Anything else (open/draft) is left untouched.
 *
 * Run: tsx scripts/backfill-stripe-monthly-paid.ts
 */
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const prisma = new PrismaClient();

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error("STRIPE_SECRET_KEY is not set");
  process.exit(1);
}
const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

function getStripeSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromParent = (invoice as any).parent?.subscription_details?.subscription;
  if (typeof fromParent === "string") return fromParent;
  if (fromParent && typeof fromParent === "object" && "id" in fromParent) {
    return (fromParent as { id: string }).id;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const legacy = (invoice as any).subscription;
  return typeof legacy === "string" ? legacy : null;
}

async function main() {
  const candidates = await prisma.donation.findMany({
    where: {
      status: "PAID",
      paidAt: null,
      subscriptionId: { not: null },
      provider: "STRIPE",
      providerOrderId: { not: null },
    },
    include: {
      items: true,
      categoryItems: true,
    },
  });

  console.log(`Found ${candidates.length} stuck monthly donation(s) to verify against Stripe.`);

  let markedPaid = 0;
  let markedFailed = 0;
  let stillPending = 0;
  let errored = 0;

  for (const d of candidates) {
    try {
      const invoice = await stripe.invoices.retrieve(d.providerOrderId!);

      if (invoice.status === "paid") {
        const paidAt = invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : d.createdAt;
        const subId = getStripeSubscriptionIdFromInvoice(invoice);

        await prisma.$transaction(async (tx) => {
          await tx.donation.update({
            where: { id: d.id },
            data: {
              status: "PAID",
              paidAt,
              providerAuthCode: subId ?? undefined,
              providerTxnResult: "Success",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              providerRaw: invoice as any,
            },
          });

          for (const item of d.items) {
            await tx.campaign.update({
              where: { id: item.campaignId },
              data: { currentAmount: { increment: item.amountUSD ?? item.amount } },
            });
          }
          for (const item of d.categoryItems) {
            await tx.category.update({
              where: { id: item.categoryId },
              data: { currentAmount: { increment: item.amountUSD ?? item.amount } },
            });
          }
        });

        markedPaid++;
        console.log(`PAID  ${d.id} (invoice ${invoice.id}, paidAt ${paidAt.toISOString()})`);
      } else if (invoice.status === "void" || invoice.status === "uncollectible") {
        await prisma.donation.update({
          where: { id: d.id },
          data: {
            status: "FAILED",
            providerErrorMessage: `Stripe invoice ${invoice.status}`,
            providerTxnResult: "Failed",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            providerRaw: invoice as any,
          },
        });
        markedFailed++;
        console.log(`FAIL  ${d.id} (invoice ${invoice.id}, status ${invoice.status})`);
      } else {
        stillPending++;
        console.log(`SKIP  ${d.id} (invoice ${invoice.id}, status ${invoice.status})`);
      }
    } catch (err) {
      errored++;
      console.error(`ERROR ${d.id} (providerOrderId=${d.providerOrderId}):`, (err as Error).message);
    }
  }

  console.log("");
  console.log(
    `Done. Paid: ${markedPaid}, Failed: ${markedFailed}, Pending: ${stillPending}, Errors: ${errored}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
