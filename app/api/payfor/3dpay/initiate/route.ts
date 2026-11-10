import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { publicOrigin } from "@/lib/public-origin";
import crypto from "crypto";
import {
  formatPayForPurchAmount,
  payForLang,
  payForHash,
} from "@/lib/payfor";
import {
  convertAmountInCurrencyToTry,
  getUsdBaseRatesForServer,
} from "@/lib/exchange/rates-service";
import { mayInitiateForActor, mayStartPayForAttempt } from "@/lib/payfor-guest-intent";
import { resolveGateway } from "@/lib/payment-gateway";

/** Convert any amount to TRY using USD-base rates from the database (same as donations). */
async function toTRY(amount: number, fromCurrency: string): Promise<number> {
  const rates = await getUsdBaseRatesForServer();
  return convertAmountInCurrencyToTry(amount, fromCurrency, rates);
}

type InitiateBody = {
  donationId: string;
  locale?: string;
  /** Temporarily unsupported until bank tokenization is approved. */
  savedCardId?: string;
  paymentIntentToken?: string;
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Master kill-switch: if the admin disabled PayFor in GlobalSettings, every
    // one-time donation goes through Albaraka instead. Refuse to initiate a 3D
    // Secure session regardless of what the client requested. The dialogs
    // already gate the UI on the same flag — this is the server-side belt.
    const settings = await prisma.globalSettings.findFirst({
      orderBy: { createdAt: "asc" },
      select: { payforEnabled: true },
    });
    if (settings && settings.payforEnabled === false) {
      return NextResponse.json(
        { error: "PayFor gateway is disabled. This donation routes to Albaraka." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as Partial<InitiateBody>;
    const donationId = String(body.donationId || "").trim();
    if (!donationId) {
      return NextResponse.json({ error: "donationId is required" }, { status: 400 });
    }

    const donation = await prisma.donation.findUnique({
      where: { id: donationId },
      include: { items: true, categoryItems: true },
    });
    if (!donation) {
      return NextResponse.json({ error: "Donation not found" }, { status: 404 });
    }
    // Exact checkout ownership: a donationId alone must never authorize a guest.
    if (!mayInitiateForActor(donation, session?.user?.id, body.paymentIntentToken)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (body.savedCardId) {
      return NextResponse.json({ error: "Saved cards are unavailable until bank tokenization is approved." }, { status: 403 });
    }
    // The legacy status 'PAID' is also used for unconfirmed checkout records.
    // Only paidAt proves settlement; any existing provider attempt is locked.
    if (!mayStartPayForAttempt(donation)) {
      return NextResponse.json({ error: "Payment already settled or in progress; check its status first." }, { status: 409 });
    }
    // QNB 3DPay form needs UserPass in browser form data. No approved
    // server-side/hosted credential-free replacement has been verified yet.
    // Fail closed before a provider order is allocated or card data is handled.
    if (process.env.PAYFOR_SECURE_BROWSER_FLOW_VERIFIED !== "1") {
      return NextResponse.json({ error: "PayFor requires an approved secure hosted payment flow." }, { status: 503 });
    }
    // Even if the flag is configured, the legacy browser flow remains blocked.
    // A verified implementation must replace this handler, not toggle a flag.
    return NextResponse.json({ error: "PayFor legacy browser form is disabled." }, { status: 503 });

    // Enforce the same routing the dialogs use: PayFor takes every currency except
    // lira, which belongs to Albaraka.
    const resolved = resolveGateway({
      payforEnabled: settings?.payforEnabled ?? true,
      currency: donation.currency,
      donationType: donation.subscriptionId ? "MONTHLY" : "ONE_TIME",
    });
    if (resolved !== "PAYFOR") {
      return NextResponse.json(
        { error: `This donation routes to ${resolved}, not PayFor.` },
        { status: 403 }
      );
    }
    const gatewayUrl = process.env.PAYFOR_3DPAY_URL;
    const mbrId = process.env.PAYFOR_MBR_ID;
    const merchantId = process.env.PAYFOR_MERCHANT_ID;
    const merchantPass = process.env.PAYFOR_MERCHANT_PASS;
    const userCode = process.env.PAYFOR_USER_CODE;
    const userPass = process.env.PAYFOR_USER_PASS;

    if (!gatewayUrl || !mbrId || !merchantId || !merchantPass || !userCode || !userPass) {
      return NextResponse.json(
        { error: "PayFor is not configured on server" },
        { status: 500 }
      );
    }

    // Use APP_URL env var so OkUrl/FailUrl match the bank's registered MerchantHomeUrl.
    // Without this, localhost:3000 is sent and the bank's 3D auth server rejects it.
    const origin = publicOrigin(req);
    const locale = (body.locale ?? donation.locale ?? "en").toString().toLowerCase();

    const orderId = donation.id; // within 50 chars (ObjectId)
    const txnType = "Auth";
    const installmentCount = "0";

    // Ziraat Katılım merchant account is TRY-only (M050 if other currency sent).
    // Always charge in TRY; convert if the donation was recorded in another currency.
    const tryAmount = await toTRY(donation.totalAmount, donation.currency);
    const currency = "949"; // TRY
    const purchAmount = formatPayForPurchAmount(tryAmount);
    const rnd = cryptoRandom(24);

    const okUrl = `${origin}/api/payfor/3dpay/ok?donationId=${encodeURIComponent(
      donation.id
    )}&locale=${encodeURIComponent(locale)}`;
    const failUrl = `${origin}/api/payfor/3dpay/fail?donationId=${encodeURIComponent(
      donation.id
    )}&locale=${encodeURIComponent(locale)}`;

    // Hash = hex(SHA1(MbrId + OrderId + PurchAmount + OkUrl + FailUrl + TxnType + InstallmentCount + Rnd + MerchantPass))
    // Docs formula confirmed; MerchantID and UserCode are NOT part of the hash for this bank.
    const hash = payForHash({
      mbrId,
      orderId,
      purchAmount,
      okUrl,
      failUrl,
      txnType,
      installmentCount,
      rnd,
      merchantPass,
    });



    await prisma.donation.update({
      where: { id: donation.id },
      data: {
        locale,
        provider: "PAYFOR",
        providerOrderId: orderId,
        providerTxnType: txnType,
        // What we asked the bank to charge. The ok callback compares the bank's
        // PurchAmount against it, so a swapped amount can't settle the donation.
        providerRaw: { payforRequest: { orderId, purchAmount, currency } },
      },
    });

    const formFields: Record<string, string> = {
      MbrId: mbrId,
      MerchantID: merchantId,
      UserCode: userCode,
      UserPass: userPass,
      SecureType: "3DPay",
      TxnType: txnType,
      InstallmentCount: installmentCount,
      Currency: currency,
      OkUrl: okUrl,
      FailUrl: failUrl,
      OrderId: orderId,
      PurchAmount: purchAmount,
      Lang: payForLang(locale),
      MOTO: "0",
      Rnd: rnd,
      Hash: hash,
      // For new cards: Pan/Expiry/Cvv2/CardHolderName are added client-side and posted
      //   directly browser → bank.
      // For saved cards: Pan/Expiry/CardHolderName are filled below from decrypted DB
      //   row; the browser still appends Cvv2 (CVC isn't stored).
    };

    // Saved-card path: decrypt the stored PAN and pass it to the bank.
    // PayFor returns MR07 "Request CardBrand Error" if the PAN is masked
    // (asterisks), which is what happened before we wired this flow up.
    const savedCardId = body.savedCardId?.trim();
    if (savedCardId) {
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Authentication required for saved cards" },
          { status: 401 }
        );
      }
      const savedCard = await prisma.creditCard.findUnique({
        where: { id: savedCardId },
        select: {
          userId: true,
          cardNumber: true,
          expiryDate: true,
          cardholderName: true,
        },
      });
      if (!savedCard || savedCard.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Saved card not found" },
          { status: 404 }
        );
      }
      let pan: string;
      try {
        pan = decryptCard(savedCard.cardNumber).replace(/\D/g, "");
      } catch {
        return NextResponse.json(
          { error: "Failed to decrypt saved card" },
          { status: 500 }
        );
      }
      // Stored as "MM/YY" → PayFor wants "MMYY"
      const expiry = (savedCard.expiryDate || "").replace(/\D/g, "");
      formFields.Pan = pan;
      formFields.Expiry = expiry;
      formFields.CardHolderName = savedCard.cardholderName ?? "";
    }



    return NextResponse.json({
      actionUrl: gatewayUrl,
      fields: formFields,
    });
  } catch (error) {
    console.error("PayFor initiate error:", error);
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 });
  }
}

function cryptoRandom(len: number) {
  // URL-safe-ish random string
  return crypto
    .randomBytes(Math.ceil(len / 2))
    .toString("hex")
    .slice(0, len);
}

