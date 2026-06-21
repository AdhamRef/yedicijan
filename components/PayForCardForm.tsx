"use client";

/**
 * PayForCardForm — raw card inputs for the PayFor (Ziraat Katılım) 3D Secure flow.
 * Card data is collected here and POSTed directly to the bank via HTML form submit.
 * This component has NO connection to Stripe whatsoever.
 */

import Cards from "react-credit-cards-2";
import "react-credit-cards-2/dist/es/styles-compiled.css";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";

export interface PayForCardState {
  cardNumber: string;
  expiryDate: string; // MM/YY format
  cvv: string;
  cardholderName: string;
}

interface Props {
  cardDetails: PayForCardState;
  setCardDetails: (details: PayForCardState) => void;
  cardFocus: string;
  setCardFocus: (focus: string) => void;
}

export function PayForCardForm({
  cardDetails,
  setCardDetails,
  cardFocus,
  setCardFocus,
}: Props) {
  const t = useTranslations("DonationDialog");

  return (
    <div className="space-y-4" dir="ltr">
      <div className="flex justify-center">
        <Cards
          number={cardDetails.cardNumber}
          expiry={cardDetails.expiryDate.replace("/", "")}
          cvc={cardDetails.cvv}
          name={cardDetails.cardholderName}
          focused={cardFocus as "name" | "number" | "expiry" | "cvc"}
        />
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t("cardNumber")}
          </label>
          <Input
            value={cardDetails.cardNumber}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
              const formatted = digits.replace(/(.{4})/g, "$1 ").trimEnd();
              setCardDetails({ ...cardDetails, cardNumber: formatted });
            }}
            onFocus={() => setCardFocus("number")}
            placeholder="0000 0000 0000 0000"
            maxLength={19}
            inputMode="numeric"
            autoComplete="cc-number"
            className="font-mono tracking-widest"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t("cardholderName")}
          </label>
          <Input
            value={cardDetails.cardholderName}
            onChange={(e) =>
              setCardDetails({
                ...cardDetails,
                // Strip digits — prevents Stripe's "name contains card number" error on fallback
                cardholderName: e.target.value.replace(/\d/g, "").toUpperCase(),
              })
            }
            onFocus={() => setCardFocus("name")}
            placeholder={t("cardholderNamePlaceholder")}
            autoComplete="cc-name"
            className="uppercase"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t("expiryDate")}
            </label>
            <Input
              value={cardDetails.expiryDate}
              onChange={(e) => {
                let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                setCardDetails({ ...cardDetails, expiryDate: v });
              }}
              onFocus={() => setCardFocus("expiry")}
              placeholder={t("expiryDatePlaceholder")}
              maxLength={5}
              inputMode="numeric"
              autoComplete="cc-exp"
              className="font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t("securityCode")}
            </label>
            <Input
              value={cardDetails.cvv}
              onChange={(e) =>
                setCardDetails({
                  ...cardDetails,
                  cvv: e.target.value.replace(/\D/g, "").slice(0, 4),
                })
              }
              onFocus={() => setCardFocus("cvc")}
              placeholder={t("securityCodePlaceholder")}
              maxLength={4}
              inputMode="numeric"
              autoComplete="cc-csc"
              className="font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
