"use client";

/**
 * Stripe card step, split out so DonationDialog can load it on demand. Importing
 * `@stripe/stripe-js` injects Stripe's script into the page as a side effect, so while
 * monthly donations are off (see MONTHLY_DONATIONS_ENABLED) this file must not be
 * pulled in at all. `handleRef` is a plain prop because next/dynamic doesn't forward refs.
 */

import type { Ref } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/stripe-client";
import { StripePaymentStep, type StripePaymentHandle } from "@/components/StripePaymentStep";

export default function StripeElementsStep({
  handleRef,
  onReadyChange,
}: {
  handleRef: Ref<StripePaymentHandle>;
  onReadyChange: (ready: boolean) => void;
}) {
  return (
    <Elements stripe={getStripePromise()}>
      <StripePaymentStep ref={handleRef} onReadyChange={onReadyChange} />
    </Elements>
  );
}
