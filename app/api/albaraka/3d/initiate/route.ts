import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { publicOrigin } from "@/lib/public-origin";
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
  type AlbarakaFormFields,
} from "@/lib/albaraka";
import { resolveGateway } from "@/lib/payment-gateway";
import {
  convertAmountBetweenCurrencies,
  convertAmountInCurrencyToTry,
  getUsdBaseRatesForServer,
} from "@/lib/exchange/rates-service";
import { decryptCard } from "@/lib/card-crypto";

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
  const from = fromCurrency === "TL" ? "TRY" : fromCurrency;
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
  try {
    const session = await getServerSession(authOptions);
    const cfg = albarakaConfig();

    if (!isAlbarakaConfigured(cfg)) {
      return NextResponse.json(
        { error: "Albaraka is not configured on server" },
        { status: 500 }
      );
    }

    // Server-side belt: the dialogs already route by currency, but a client could
    // call this directly. Albaraka takes everything except lira, and lira only when
    // PayFor is switched off.
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
      donationType: donation.subscriptionId ? "MONTHLY" : "ONE_TIME",
    });
    if (resolved !== "ALBARAKA") {
      return NextResponse.json(
        { error: `This donation routes to ${resolved}, not Albaraka.` },
        { status: 403 }
      );
    }

    // APP_URL keeps OkUrl/ReturnURL on the domain registered with the bank; a bare
    // localhost origin gets the 3D form rejected.
    const origin = publicOrigin(req);
    const locale = (body.locale ?? donation.locale ?? "en").toString().toLowerCase();

    // ALBARAKA_CHARGE_CURRENCY picks what the bank is asked to charge (TRY by default —
    // the merchant account is Turkish). The donation is converted into that currency
    // with the same DB rates the donations use.
    const donationCurrency = String(donation.currency || "TRY").toUpperCase();
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
    // Empty strings when the bank's hosted page collects the card. They still take
    // part in the MAC as empty values — the separator positions must not shift.
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
          { error: "Card number, expiry and security code are required" },
          { status: 400 }
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

    await prisma.donation.update({
      where: { id: donation.id },
      data: {
        locale,
        provider: "ALBARAKA",
        providerOrderId: orderId,
        providerTxnType: transactionType,
        // Snapshot of what we actually asked the bank to charge. The callback
        // replays it to detect an amount/order swap and to build the /Sale call
        // without re-running the FX conversion (rates can move in between).
        providerRaw: {
          albarakaRequest: {
            orderId,
            amount,
            currencyCode,
            transactionType,
            useOOS: cfg.useOOS,
            createdAt: new Date().toISOString(),
          },
        } as Prisma.InputJsonValue,
      },
    });

    // Mac and MacParams ride alongside the form; neither is part of the MAC input.
    const formFields: Record<string, string> = {};
    for (const name of ALBARAKA_FORM_FIELDS) formFields[name] = fields[name];
    formFields.Mac = mac;
    formFields.MacParams = ALBARAKA_FORM_MAC_PARAMS;

    console.log("[Albaraka INITIATE]", {
      donationId: donation.id,
      orderId,
      amount,
      currencyCode,
      useOOS: cfg.useOOS,
      merchantReturnURL,
    });

    return NextResponse.json({ actionUrl: cfg.tdsUrl, fields: formFields });
  } catch (error) {
    console.error("Albaraka initiate error:", error);
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 });
  }
}
