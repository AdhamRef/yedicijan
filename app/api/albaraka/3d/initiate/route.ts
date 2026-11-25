import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { paymentPublicOrigin } from "@/lib/payment-public-origin";
import {
  ALBARAKA_FORM_FIELDS,
  ALBARAKA_FORM_MAC_PARAMS,
  albarakaConfig,
  albarakaCurrencyCode,
  albarakaFormMac,
  albarakaLang,
  albarakaMinorUnits,
  albarakaOrderId,
  albarakaTargetCurrency,
  isAlbarakaConfigured,
  isValidBankExpiry,
  isValidCardNumber,
  type AlbarakaFormFields,
} from "@/lib/albaraka";
import { resolveGateway } from "@/lib/payment-gateway";
import { checkCardAttempt } from "@/lib/security/card-attempts";
import { donationFieldEmpty, donationWhereAll } from "@/lib/donations/mongo-null";
import {
  convertAmountBetweenCurrencies,
  convertAmountInCurrencyToTry,
  getUsdBaseRatesForServer,
} from "@/lib/exchange/rates-service";
import { normalizeCurrencyCode } from "@/lib/exchange/convert";
import { decryptCard, detectCardType } from "@/lib/card-crypto";

/**
 * POST /api/albaraka/3d/initiate
 *
 * Builds the signed hidden-input set for Albaraka's SecureVerification page. The
 * browser turns the response into an HTML form and POSTs it to `actionUrl`, which
 * hands the donor over to the bank for 3D authentication; the bank then POSTs its
 * verdict to /api/albaraka/3d/callback.
 *
 * Unlike PayFor, Albaraka signs the card fields into the request MAC, so the card
 * has to be known here rather than appended by the browser. Three ways to supply it:
 *   - `savedCardId` — we decrypt the stored PAN (browser still adds nothing; the CVV
 *      is folded in from `card.cvv` since CVCs are never stored)
 *   - `card`        — the donor's freshly-typed card, posted over TLS to this route
 *   - neither, with ALBARAKA_USE_OOS=1 — the card fields go out empty and the bank's
 *      own hosted page (Ortak Ödeme Sayfası) collects them, keeping the PAN off our
 *      servers entirely. This is the deployment we'd recommend.
 *
 * No money moves here: the callback captures (/Sale) only after a verified 3D result.
 */

type InitiateBody = {
  donationId: string;
  locale?: string;
  savedCardId?: string;
  card?: {
    /** PAN, spaces tolerated. */
    number?: string;
    /** "MM/YY" or "MMYY" — the bank wants YYMM, we convert. */
    expiry?: string;
    cvv?: string;
    holder?: string;
  };
};

/** Convert an amount into the charge currency using USD-base rates from the database (same as donations). */
async function toCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
  // `DEFAULT` (no currency chosen) is USD; see normalizeCurrencyCode.
  const from = normalizeCurrencyCode(fromCurrency === "TL" ? "TRY" : fromCurrency);
  if (from === toCurrency) return amount;
  const rates = await getUsdBaseRatesForServer();
  return toCurrency === "TRY"
    ? convertAmountInCurrencyToTry(amount, from, rates)
    : convertAmountBetweenCurrencies(amount, from, toCurrency, rates);
}

/**
 * The bank wants the expiry as YYMM ("2001" = January 2020). Donors type MM/YY and
 * saved cards are stored MM/YY, so both normalise through here.
 */
function toBankExpiry(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length !== 4) return "";
  const mm = digits.slice(0, 2);
  const yy = digits.slice(2, 4);
  return `${yy}${mm}`;
}

export async function POST(req: NextRequest) {
  /* Set while this request holds the "Processing" claim but has not handed the
     form back yet; an error in that window releases the donation for a retry. */
  let unsentClaim: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    const cfg = albarakaConfig();

    if (!isAlbarakaConfigured(cfg)) {
      return NextResponse.json(
        { error: "Albaraka is not configured on server" },
        { status: 503 }
      );
    }

    // Server-side belt: the dialogs already route by currency, but a client could
    // call this directly. Albaraka takes lira donations, and every other currency
    // only when PayFor is switched off.
    const settings = await prisma.globalSettings.findFirst({
      orderBy: { createdAt: "asc" },
      select: { payforEnabled: true },
    });
    const payforEnabled = settings?.payforEnabled ?? true;

    const body = (await req.json()) as Partial<InitiateBody>;
    const donationId = String(body.donationId || "").trim();
    if (!donationId) {
      return NextResponse.json({ error: "donationId is required" }, { status: 400 });
    }

    const donation = await prisma.donation.findUnique({ where: { id: donationId } });
    if (!donation) {
      return NextResponse.json({ error: "Donation not found" }, { status: 404 });
    }
    // Authenticated users: verify ownership. Guests have no session — trust the donationId.
    if (session?.user?.id && donation.donorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (donation.status === "FAILED") {
      return NextResponse.json(
        { error: `Donation has already failed (status=${donation.status})` },
        { status: 400 }
      );
    }
    if (donation.paidAt) {
      return NextResponse.json({ error: "Donation already paid" }, { status: 400 });
    }
    // Enforce the same routing the dialogs use, so a hand-crafted request can't
    // push a donation down the wrong rail.
    const resolved = resolveGateway({
      payforEnabled,
      currency: donation.currency,
    });
    if (resolved !== "ALBARAKA") {
      return NextResponse.json(
        { error: `This donation routes to ${resolved}, not Albaraka.` },
        { status: 403 }
      );
    }

    // APP_URL keeps OkUrl/ReturnURL on the domain registered with the bank; a bare
    // localhost origin gets the 3D form rejected.
    const origin = paymentPublicOrigin(req.url);
    const locale = (body.locale ?? donation.locale ?? "en").toString().toLowerCase();

    // ALBARAKA_CHARGE_CURRENCY picks what the bank is asked to charge (TRY by default —
    // the merchant account is Turkish). The donation is converted into that currency
    // with the same DB rates the donations use. The donation row keeps its own currency.
    const donationCurrency = donation.currency ? normalizeCurrencyCode(donation.currency) : "TRY";
    const targetCurrency = albarakaTargetCurrency(donationCurrency, cfg.chargeCurrency);
    const chargeAmount = await toCurrency(donation.totalAmount, donationCurrency, targetCurrency);
    const currencyCode = albarakaCurrencyCode(targetCurrency);
    const amount = albarakaMinorUnits(chargeAmount);
    if (amount <= 0) {
      return NextResponse.json({ error: "Invalid donation amount" }, { status: 400 });
    }

    // 3D orders are exactly 20 characters, so the donation's own 24-char ObjectId
    // can't be reused the way PayFor does it. The generated id is persisted and the
    // callback cross-checks it.
    const orderId = albarakaOrderId();
    const transactionType = "Sale";
    const merchantReturnURL = `${origin}/api/albaraka/3d/callback?donationId=${encodeURIComponent(
      donation.id
    )}&locale=${encodeURIComponent(locale)}`;

    // ── Card fields ────────────────────────────────────────────────────────────
    // Empty strings when the bank's hosted page collects the card; they then simply
    // contribute nothing to the MAC.
    let cardNo = "";
    let expiredDate = "";
    let cvv = "";
    let cardHolderName = "";

    if (!cfg.useOOS) {
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
          return NextResponse.json({ error: "Saved card not found" }, { status: 404 });
        }
        try {
          cardNo = decryptCard(savedCard.cardNumber).replace(/\D/g, "");
        } catch {
          return NextResponse.json(
            { error: "Failed to decrypt saved card" },
            { status: 500 }
          );
        }
        expiredDate = toBankExpiry(savedCard.expiryDate || "");
        cardHolderName = savedCard.cardholderName ?? "";
        // CVCs are never stored — the donor re-types it for every saved-card charge.
        cvv = String(body.card?.cvv || "").replace(/\D/g, "");
      } else {
        cardNo = String(body.card?.number || "").replace(/\D/g, "");
        expiredDate = toBankExpiry(body.card?.expiry || "");
        cvv = String(body.card?.cvv || "").replace(/\D/g, "");
        cardHolderName = String(body.card?.holder || "").trim();
      }

      if (!cardNo || !expiredDate || !cvv) {
        return NextResponse.json(
          { error: "Card number, expiry and security code are required", code: "CARD_REQUIRED" },
          { status: 400 }
        );
      }
      // Caught here rather than spent as a bank decline (and a FAILED donation).
      if (!isValidCardNumber(cardNo)) {
        return NextResponse.json({ error: "Invalid card number", code: "INVALID_CARD_NUMBER" }, { status: 400 });
      }
      if (!isValidBankExpiry(expiredDate)) {
        return NextResponse.json({ error: "Card expiry date is invalid or in the past", code: "INVALID_CARD_EXPIRY" }, { status: 400 });
      }
      if (!/^\d{3,4}$/.test(cvv)) {
        return NextResponse.json({ error: "Invalid security code", code: "INVALID_CARD_CVC" }, { status: 400 });
      }
      cardHolderName = cardHolderName.replace(/\s+/g, " ").slice(0, 50);

      /* Card-testing brakes, before the claim so a refused attempt leaves the
         donation untouched and the donor can retry once the window passes. */
      const attempt = await checkCardAttempt(req.headers, cardNo, "ALBARAKA");
      if (!attempt.ok) {
        console.warn("[Albaraka] card attempt refused", { donationId: donation.id, reason: attempt.reason });
        return NextResponse.json(
          { error: "Too many payment attempts. Please try again later.", code: "TOO_MANY_ATTEMPTS" },
          { status: 429, headers: { "Retry-After": String(attempt.retryAfterSeconds) } }
        );
      }
    }

    const fields: AlbarakaFormFields = {
      PosnetID: cfg.posnetId,
      MerchantNo: cfg.merchantNo,
      TerminalNo: cfg.terminalNo,
      OrderId: orderId,
      TransactionType: transactionType,
      CardNo: cardNo,
      ExpiredDate: expiredDate,
      Cvv: cvv,
      CardHolderName: cardHolderName,
      Amount: String(amount),
      InstallmentCount: "0", // 0 = peşin (single payment)
      MerchantReturnURL: merchantReturnURL,
      Language: albarakaLang(locale),
      CurrencyCode: currencyCode,
      UseJokerVadaa: cfg.useJokerVadaa ? "1" : "0",
      KOICode: "",
      // The browser decides popup vs. same-tab itself; the bank never opens one for us.
      OpenNewWindow: "0",
      UseOOS: cfg.useOOS ? "1" : "0",
      TxnState: "INITIAL",
      VftCode: "",
      gsmNo: "",
      packetCode: "",
    };

    // Only these six values are signed; the rest of the form rides along unsigned.
    // Cvc2/CardNo/ExpireDate are the empty strings set above when the bank's hosted
    // page is collecting the card.
    const mac = albarakaFormMac(
      {
        merchantNo: cfg.merchantNo,
        terminalNo: cfg.terminalNo,
        cardNo,
        cvc2: cvv,
        expireDate: expiredDate,
        amount: String(amount),
      },
      cfg.encKey
    );

    /* Record this attempt atomically. A fresh 3D session may replace an earlier,
       abandoned one (its callback then fails the order-id linkage and captures
       nothing), but never one whose callback is already capturing or rejecting —
       the callback's own claim is what guarantees a single /Sale. `paidAt` is
       ABSENT, not null, on a fresh row, so `donationFieldEmpty` matches both. */
    const claim = await prisma.donation.updateMany({
      where: donationWhereAll(
        { id: donation.id, status: { not: "FAILED" } },
        donationFieldEmpty("paidAt"),
        {
          OR: [
            { providerTxnResult: { isSet: false } },
            { providerTxnResult: null },
            { providerTxnResult: { notIn: ["Capturing3D", "Rejecting3D"] } },
          ],
        }
      ),
      data: {
        locale,
        provider: "ALBARAKA",
        providerOrderId: orderId,
        providerTxnType: transactionType,
        providerTxnResult: "Processing",
        // Snapshot of what we actually asked the bank to charge. The callback
        // replays it to detect an amount/order swap and to build the /Sale call
        // without re-running the FX conversion (rates can move in between).
        providerRaw: {
          ...(typeof donation.providerRaw === "object" && donation.providerRaw ? (donation.providerRaw as object) : {}),
          ...(cardNo ? { cardSummary: { last4: cardNo.slice(-4), brand: detectCardType(cardNo) } } : {}),
          albarakaRequest: {
            merchantNo: cfg.merchantNo,
            terminalNo: cfg.terminalNo,
            orderId,
            amount,
            currencyCode,
            transactionType,
            mode: "3D",
            useOOS: cfg.useOOS,
            createdAt: new Date().toISOString(),
          },
        } as Prisma.InputJsonValue,
      },
    });
    if (claim.count !== 1) {
      return NextResponse.json(
        { error: "A payment for this donation is already in progress or finished.", code: "PAYMENT_ALREADY_PROCESSING" },
        { status: 409 }
      );
    }
    unsentClaim = donation.id;

    // Mac and MacParams ride alongside the form; neither is part of the MAC input.
    const formFields: Record<string, string> = {};
    for (const name of ALBARAKA_FORM_FIELDS) formFields[name] = fields[name];
    formFields.Mac = mac;
    formFields.MacParams = ALBARAKA_FORM_MAC_PARAMS;

    // Never log card-bearing fields.
    console.log("[Albaraka INITIATE]", {
      donationId: donation.id,
      orderId,
      amount,
      currencyCode,
      useOOS: cfg.useOOS,
      merchantReturnURL,
    });

    unsentClaim = null;
    return NextResponse.json(
      { actionUrl: cfg.tdsUrl, fields: formFields },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Albaraka initiate error:", error);
    if (unsentClaim) {
      await prisma.donation
        .updateMany({ where: { id: unsentClaim, providerTxnResult: "Processing" }, data: { providerTxnResult: null } })
        .catch(() => {});
    }
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 });
  }
}
