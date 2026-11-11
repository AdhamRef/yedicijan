import { proofFromCheckoutSession, proofFromPaymentIntent, settleVerifiedStripeDonation, stripeRecurringInvoiceMatches, stripeRecurringCustomerMatches } from "@/lib/donations/stripe-settlement";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { getDonorCountryCodeForSnapshot } from "@/lib/donations/donor-country-code";
// Donate (success) is no longer fired from this webhook — it's owned by the
// /success page via POST /api/donations/:id/track-conversion so the browser
// Pixel and CAPI fire as a single dedup'd pair. DonateFailed remains here
// because failed donors typically never reach a /success-style page.
import { sendDonationFailedConversions } from "@/lib/tracking/donation-conversion-server";
import { dispatchDonationPaid, dispatchEvent } from "@/lib/events/dispatch";
import { donationFieldEmpty } from "@/lib/donations/mongo-null";
import { normalizeDonationCurrencyCode } from "@/lib/exchange/convert-amount-in-currency-to-usd";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

// Stripe removed `invoice.subscription` in API 2024-09-30. The subscription ID
// now lives under `invoice.parent.subscription_details.subscription`. Read the
// new path first and fall back to the legacy field so older events still work.
function getStripeSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const fromParent = (invoice as any).parent?.subscription_details?.subscription;
  if (typeof fromParent === "string") return fromParent;
  if (fromParent && typeof fromParent === "object" && "id" in fromParent) {
    return (fromParent as { id: string }).id;
  }
  const legacy = (invoice as any).subscription;
  return typeof legacy === "string" ? legacy : null;
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error("Stripe webhook: missing signature or secret");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.arrayBuffer();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(Buffer.from(rawBody), sig, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const donationId = session.metadata?.donationId;
        const subscriptionDbId = session.metadata?.subscriptionDbId;

        if (!donationId) break;

        const isMonthly = session.mode === "subscription";

        if (!isMonthly) {
          const proof = proofFromCheckoutSession(session);
          if (!proof) {
            console.warn("[Stripe webhook] Checkout held for verified bank reconciliation");
            break;
          }
          const result = await settleVerifiedStripeDonation(proof);
          if (result === "paid") void dispatchDonationPaid(donationId);
          break;
        }
        // Monthly first-invoice settlement must use the independently verified
        // invoice.payment_succeeded path. Never mark a donation paid just
        // because a subscription Checkout session was completed.
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId = getStripeSubscriptionIdFromInvoice(invoice);
        if (!stripeSubscriptionId) break;

        // Find our DB subscription by Stripe subscription ID (stored in payforToken)
        const linkedSubscriptions = await prisma.subscription.findMany({
          where: { payforToken: stripeSubscriptionId },
          take: 2,
          include: { items: true, categoryItems: true },
        });
        // payforToken is not unique in the historical schema. Never allocate
        // a verified invoice to an arbitrary donor when two rows share it.
        if (linkedSubscriptions.length !== 1) {
          console.warn("[Stripe webhook] Recurring invoice held: subscription binding missing or ambiguous");
          break;
        }
        const dbSubscription = linkedSubscriptions[0];
        if (!stripeRecurringCustomerMatches(dbSubscription, invoice, stripeSubscriptionId)) {
          console.warn("[Stripe webhook] Recurring invoice held: customer ownership not verified");
          break;
        }
        if (!stripeRecurringInvoiceMatches(dbSubscription, invoice, stripeSubscriptionId)) {
          console.warn("[Stripe webhook] Recurring invoice held: unverified order/amount/currency");
          break;
        }

        // Idempotency: skip if we've already settled this invoice. The original
        // "checkout started" donation for the first invoice also carries this
        // `providerOrderId` (set by /api/stripe/subscribe) but with `paidAt: null`,
        // so we MUST require `paidAt` to be set here — otherwise the webhook would
        // bail out without ever marking the donation paid. That was the source of
        // the long-standing "monthly donations stuck PAID/paidAt=null" bug.
        const existingForInvoice = await prisma.donation.findFirst({
          where: {
            subscriptionId: dbSubscription.id,
            providerOrderId: invoice.id,
            paidAt: { not: null },
          },
        });
        if (existingForInvoice) break;

        // Invoice creation is NOT payment time. Require an authenticated paid
        // transition from the signed Stripe invoice before recording settlement.
        // A missing transition is held for Test Mode/provider reconciliation,
        // never silently backdated to invoice creation.
        const paidTimestamp = invoice.status_transitions?.paid_at;
        if (typeof paidTimestamp !== "number" || !Number.isSafeInteger(paidTimestamp) ||
            paidTimestamp <= 0 || paidTimestamp > Math.floor(Date.now() / 1000) + 300) {
          console.warn("[Stripe webhook] Paid invoice held: missing/invalid payment timestamp");
          break;
        }
        const paidAt = new Date(paidTimestamp * 1000);

        // Stripe's own first-vs-renewal marker. "subscription_create" is the signup
        // charge; "subscription_cycle" is an automatic renewal. Anything else
        // (subscription_update / manual) is treated as a renewal-style charge —
        // it is money taken without a fresh checkout, so it needs its own row.
        const billingReason = ((invoice as any).billing_reason as string | null) ?? null;
        const isSignupInvoice = billingReason === "subscription_create";

        // nextBillingDate = one month after this invoice was paid. Stripe owns the
        // actual billing cadence (donors can't pick a day); we just mirror it so
        // the admin UI and cron filters have a usable value. Clamp to the target
        // month's last day to handle edge cases like the 31st.
        const nextBillingDate = new Date(Date.UTC(
          paidAt.getUTCFullYear(),
          paidAt.getUTCMonth() + 1,
          1,
        ));
        const lastDay = new Date(Date.UTC(
          nextBillingDate.getUTCFullYear(),
          nextBillingDate.getUTCMonth() + 1,
          0,
        )).getUTCDate();
        nextBillingDate.setUTCDate(Math.min(paidAt.getUTCDate(), lastDay));
        nextBillingDate.setUTCHours(0, 0, 0, 0);

        const fees = (dbSubscription.amount + dbSubscription.teamSupport) * 0.03;
        const finalTotal =
          dbSubscription.amount +
          dbSubscription.teamSupport +
          (dbSubscription.coverFees ? fees : 0);

        const donorCountrySnapshot =
          (await getDonorCountryCodeForSnapshot(prisma, dbSubscription.donorId)) ??
          undefined;

        await prisma.$transaction(async (tx) => {
          // Unique signed invoice id is committed atomically with money/totals.
          // Two concurrent replays cannot both create this record.
          await tx.stripeInvoiceSettlement.create({
            data: {
              invoiceId: invoice.id,
              subscriptionId: dbSubscription.id,
              donorId: dbSubscription.donorId,
              amountSmallestUnit: invoice.amount_paid,
              currency: invoice.currency.toLowerCase(),
            },
          });
          // Find the original "checkout started" donation for this subscription
          // (status=PAID is the optimistic sentinel; paidAt=null means it never
          // settled). For the FIRST invoice we update that row instead of
          // creating a duplicate. Match by providerOrderId when it lines up,
          // but fall back to the unpaid row for this subscription — different
          // checkout flows (PaymentElement vs Checkout Session) store different
          // ids in providerOrderId, so equality-by-invoice-id isn't reliable.
          //
          // The fallback is deliberately gated on this being the SIGNUP invoice.
          // It matches any dangling unsettled row for the subscription, so on a
          // renewal (`subscription_cycle`) it would silently swallow the new
          // charge into a months-old row instead of creating one — the renewal
          // would then be invisible in every createdAt-ranged dashboard and the
          // subscription would stay permanently one donation short.
          // `paidAt` is ABSENT (not null) on rows created by the checkout routes, and Prisma's
          // `{ paidAt: null }` does not match an absent field on MongoDB. That mismatch is what
          // made this handler miss the row it had already created and insert a duplicate
          // donation for an invoice it had just recorded — see lib/donations/mongo-null.ts.
          const existingPending =
            (await tx.donation.findFirst({
              where: {
                AND: [
                  { subscriptionId: dbSubscription.id, donorId: dbSubscription.donorId, provider: "STRIPE", providerOrderId: invoice.id },
                  donationFieldEmpty("paidAt"),
                ],
              },
            })) ??
            (isSignupInvoice
              ? await tx.donation.findFirst({
                  where: {
                    AND: [
                      { subscriptionId: dbSubscription.id, donorId: dbSubscription.donorId, provider: "STRIPE", status: "PAID" },
                      donationFieldEmpty("paidAt"),
                    ],
                  },
                  orderBy: { createdAt: "asc" },
                })
              : null);

          if (existingPending) {
            // First invoice: update the existing donation with provider details
            await tx.donation.update({
              where: { id: existingPending.id },
              data: {
                status: "PAID",
                paidAt,
                billingReason,
                providerOrderId: invoice.id,
                providerAuthCode: stripeSubscriptionId,
                providerTxnResult: "Success",
                providerRaw: invoice as any,
              },
            });
          } else {
            // Recurring invoice: create a new PAID donation record
            await tx.donation.create({
              data: {
                amount: dbSubscription.amount,
                // NEVER fall back to the raw local amount: that writes e.g. a ₺-denominated
                // number into the USD column, inflating revenue ~34x. If the subscription is
                // itself USD, `amount` IS the USD value; otherwise record null and let the
                // dashboard's USD helpers / a backfill handle it. A null we can detect beats a
                // wrong number we cannot.
                amountUSD:
                  dbSubscription.amountUSD ??
                  (normalizeDonationCurrencyCode(dbSubscription.currency) === "USD"
                    ? dbSubscription.amount
                    : null),
                teamSupport: dbSubscription.teamSupport,
                coverFees: dbSubscription.coverFees,
                currency: dbSubscription.currency,
                fees: dbSubscription.coverFees ? fees : 0,
                totalAmount: finalTotal,
                status: "PAID",
                paidAt,
                // Stamp createdAt from the invoice too. Every dashboard/list range
                // filter keys on createdAt, so leaving it at now() would file the
                // charge under the wrong period on any delayed/replayed delivery.
                createdAt: paidAt,
                billingReason,
                donorCountryCode: donorCountrySnapshot,
                donorId: dbSubscription.donorId,
                subscriptionId: dbSubscription.id,
                // Carried from the subscription so renewals keep showing up on
                // referral dashboards and in locale-segmented reporting.
                referralId: dbSubscription.referralId ?? undefined,
                paymentMethod: "CARD",
                provider: "STRIPE",
                providerOrderId: invoice.id,
                providerAuthCode: stripeSubscriptionId,
                providerTxnResult: "Success",
                providerRaw: invoice as any,
                items: dbSubscription.items.length > 0
                  ? {
                      create: dbSubscription.items.map((item) => ({
                        campaignId: item.campaignId,
                        amount: item.amount,
                        amountUSD: item.amountUSD,
                      })),
                    }
                  : undefined,
                categoryItems: dbSubscription.categoryItems.length > 0
                  ? {
                      create: dbSubscription.categoryItems.map((item) => ({
                        categoryId: item.categoryId,
                        amount: item.amount,
                        amountUSD: item.amountUSD,
                      })),
                    }
                  : undefined,
              },
            });
          }

          // Apply campaign/category amount increments for every paid invoice
          for (const item of dbSubscription.items) {
            await tx.campaign.update({
              where: { id: item.campaignId },
              data: { currentAmount: { increment: item.amountUSD ?? item.amount } },
            });
          }
          for (const item of dbSubscription.categoryItems) {
            await tx.category.update({
              where: { id: item.categoryId },
              data: { currentAmount: { increment: item.amountUSD ?? item.amount } },
            });
          }

          // Update subscription billing dates (Stripe drives the actual cadence)
          await tx.subscription.update({
            where: { id: dbSubscription.id },
            data: {
              lastBillingDate: paidAt,
              nextBillingDate: nextBillingDate,
              status: "ACTIVE",
            },
          });
        });
        const paidForInvoice = await prisma.donation.findFirst({
          where: {
            subscriptionId: dbSubscription.id,
            providerOrderId: invoice.id,
            status: "PAID",
          },
          select: { id: true },
        });
        if (paidForInvoice) {
          void dispatchEvent("SUBSCRIPTION_PAYMENT", { donationId: paidForInvoice.id });
        }
        break;
      }

      case "invoice.payment_failed": {
        // Monthly billing failed — log a FAILED donation for audit trail.
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId = getStripeSubscriptionIdFromInvoice(invoice);
        if (!stripeSubscriptionId) break;

        const candidates = await prisma.subscription.findMany({
          where: { payforToken: stripeSubscriptionId },
          take: 2,
        });
        if (candidates.length !== 1) {
          console.warn("[Stripe webhook] Failure invoice ignored: ambiguous subscription binding");
          break;
        }
        const dbSubscription = candidates[0];
        if (!stripeRecurringCustomerMatches(dbSubscription, invoice, stripeSubscriptionId)) {
          console.warn("[Stripe webhook] Failed invoice held: customer ownership not verified");
          break;
        }

        // Idempotency: skip if already recorded
        const existingFailed = await prisma.donation.findFirst({
          where: { subscriptionId: dbSubscription.id, providerOrderId: invoice.id },
        });
        if (existingFailed) break;

        const fees = (dbSubscription.amount + dbSubscription.teamSupport) * 0.03;
        const finalTotal =
          dbSubscription.amount +
          dbSubscription.teamSupport +
          (dbSubscription.coverFees ? fees : 0);

        const donorCountrySnapshot =
          (await getDonorCountryCodeForSnapshot(prisma, dbSubscription.donorId)) ??
          undefined;

        const failedRecurring = await prisma.donation.create({
          data: {
            amount: dbSubscription.amount,
            // NEVER fall back to the raw local amount: that writes e.g. a ₺-denominated
                // number into the USD column, inflating revenue ~34x. If the subscription is
                // itself USD, `amount` IS the USD value; otherwise record null and let the
                // dashboard's USD helpers / a backfill handle it. A null we can detect beats a
                // wrong number we cannot.
                amountUSD:
                  dbSubscription.amountUSD ??
                  (normalizeDonationCurrencyCode(dbSubscription.currency) === "USD"
                    ? dbSubscription.amount
                    : null),
            teamSupport: dbSubscription.teamSupport,
            coverFees: dbSubscription.coverFees,
            currency: dbSubscription.currency,
            fees: dbSubscription.coverFees ? fees : 0,
            totalAmount: finalTotal,
            status: "FAILED",
            donorCountryCode: donorCountrySnapshot,
            donorId: dbSubscription.donorId,
            subscriptionId: dbSubscription.id,
            paymentMethod: "CARD",
            provider: "STRIPE",
            providerOrderId: invoice.id,
            providerErrorMessage: "Monthly billing failed via Stripe",
            providerRaw: invoice as any,
          },
        });
        // Seed Meta DonateFailed for the failed recurring charge so lookalike
        // audiences still get the "donor who tried" signal on monthly drops.
        void sendDonationFailedConversions(failedRecurring.id);
        break;
      }

      case "payment_intent.succeeded": {
        // Direct PaymentIntent (via Elements, not Checkout).
        // Skip if this PaymentIntent came from a Stripe Invoice (subscription payment).
        // Those are fully handled by invoice.payment_succeeded to avoid duplicate donations.
        const intent = event.data.object as Stripe.PaymentIntent;
        if ((intent as any).invoice) break;

        const donationId = intent.metadata?.donationId;
        if (!donationId) break;

        const proof = proofFromPaymentIntent(intent);
        if (!proof) {
          console.warn("[Stripe webhook] Intent held for verified bank reconciliation");
          break;
        }
        const result = await settleVerifiedStripeDonation(proof);
        if (result === "paid") void dispatchDonationPaid(donationId);
        break;
      }

      case "payment_intent.payment_failed":
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        // A failed *attempt* is not definitive payment failure; the SAME
        // PaymentIntent may succeed with another payment method later.
        // Nor can an expired/async Checkout event override a settled row.
        // Keep these donations for bank reconciliation; no FAILED state,
        // provider reference overwrite, failure notifications or conversions.
        // Webhook signature verification occurred above this switch.
        break;
      }

      case "customer.subscription.deleted": {
        // Stripe subscription cancelled
        const stripeSub = event.data.object as Stripe.Subscription;
        const matches = await prisma.subscription.findMany({
          where: { payforToken: stripeSub.id },
          take: 2,
        });
        if (matches.length !== 1) {
          console.warn("[Stripe webhook] Subscription cancellation held: ambiguous provider ownership");
          break;
        }
        const dbSubscription = matches[0];
        const cancellingCustomerId = typeof stripeSub.customer === "string"
          ? stripeSub.customer : stripeSub.customer?.id;
        if (!dbSubscription.stripeCustomerId ||
            dbSubscription.stripeCustomerId !== cancellingCustomerId) {
          console.warn("[Stripe webhook] Subscription cancellation held: Customer mismatch");
          break;
        }
        if (dbSubscription) {
          await prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: { status: "CANCELLED" },
          });
          void dispatchEvent("SUBSCRIPTION_CANCELLED", { userId: dbSubscription.donorId });
        }
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
