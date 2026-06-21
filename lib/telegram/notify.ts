import { prisma } from "@/lib/prisma";
import { tgNotify } from "./client";
import { formatDonationNotification, type FormattableDonation } from "./format";

/** Prisma select that yields a {@link FormattableDonation}. */
export const DONATION_NOTIFY_SELECT = {
  id: true,
  amount: true,
  amountUSD: true,
  currency: true,
  totalAmount: true,
  teamSupport: true,
  fees: true,
  status: true,
  paidAt: true,
  createdAt: true,
  subscriptionId: true,
  provider: true,
  providerOrderId: true,
  providerErrorMessage: true,
  paymentMethod: true,
  donorCountryCode: true,
  attribution: true,
  donor: { select: { name: true, email: true, phone: true } },
  items: { select: { campaign: { select: { title: true } } } },
  categoryItems: { select: { category: { select: { name: true } } } },
  referral: { select: { code: true, name: true } },
} as const;

async function loadDonation(donationId: string): Promise<FormattableDonation | null> {
  try {
    const row = await prisma.donation.findUnique({
      where: { id: donationId },
      select: DONATION_NOTIFY_SELECT,
    });
    if (!row) return null;
    return row as unknown as FormattableDonation;
  } catch (err) {
    console.error("[telegram] loadDonation failed:", err);
    return null;
  }
}

/**
 * Fire-and-forget notification for a donation event. Errors are swallowed —
 * the bot must never break the payment webhook. Call as `void notifyDonationEvent(...)`.
 */
export async function notifyDonationEvent(
  event: "DONATION_PAID" | "DONATION_FAILED" | "FIRST_DONATION",
  donationId: string
): Promise<void> {
  try {
    const donation = await loadDonation(donationId);
    if (!donation) return;

    // FIRST_DONATION fires alongside DONATION_PAID — emit only a banner so we don't double-post.
    if (event === "FIRST_DONATION") {
      const donorName =
        donation.donor?.name?.trim() ||
        donation.donor?.phone?.trim() ||
        donation.donor?.email ||
        "متبرع";
      const banner =
        `🌟 <b>أول تبرع لهذا المتبرع</b>\n` +
        `${donorName} — شكراً لانضمامه إلى عائلة المتبرعين`;
      await tgNotify(banner, { silent: true });
      return;
    }

    const text = formatDonationNotification(donation);
    await tgNotify(text, {
      // Failed donations should ping loudly; successful ones can be quieter at scale.
      silent: false,
      disablePreview: true,
    });
  } catch (err) {
    console.error(`[telegram] notifyDonationEvent ${event} ${donationId} failed:`, err);
  }
}
