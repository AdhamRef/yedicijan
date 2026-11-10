import { SUPPORTED_CURRENCY_CODES } from "@/lib/supported-currencies";
/**
 * Payment rail selection is intentionally conservative.
 * There is NO automatic cross-bank fallback. The PayFor 3DPay initiate route
 * remains fail-closed (503), regardless of browser-exposed feature flags.
 *
 * A non-TRY donation must not silently switch to Albaraka. That bank's
 * multi-currency merchant acceptance has not been independently approved.
 * Legacy completed transactions retain their original provider.
 */
export const MONTHLY_DONATIONS_ENABLED =
  process.env.NEXT_PUBLIC_MONTHLY_DONATIONS_ENABLED === "1";

export const SUPPORTED_DONATION_CURRENCIES = SUPPORTED_CURRENCY_CODES;


export type ResolvedGateway = "ALBARAKA" | "PAYFOR" | "STRIPE" | "UNAVAILABLE";

export type GatewayResolutionInput = {
  payforEnabled: boolean;
  currency: string;
  donationType?: "ONE_TIME" | "MONTHLY" | null;
};

export function resolveGateway({
  payforEnabled: _payforEnabled,
  currency,
  donationType = "ONE_TIME",
}: GatewayResolutionInput): ResolvedGateway {
  if (donationType === "MONTHLY") return "STRIPE";
  const code = String(currency || "").trim().toUpperCase();
  if (code === "TRY" || code === "TL") return "ALBARAKA";
  // PayFor requires an approved new server/hosted implementation.
  // NEXT_PUBLIC_PAYFOR_SECURE_FLOW_READY is not an authorization.
  return "UNAVAILABLE";
}

export function gatewayAnalyticsName(
  gateway: ResolvedGateway
): "stripe" | "albaraka" | "payfor" | "unavailable" {
  return gateway.toLowerCase() as "stripe" | "albaraka" | "payfor" | "unavailable";
}

export function gatewayUsesOwnCardForm(gateway: ResolvedGateway): boolean {
  return gateway === "PAYFOR" || gateway === "ALBARAKA";
}

export const PAYMENT_ROUTE_UNAVAILABLE_MESSAGE =
  "Card checkout is temporarily unavailable for this currency pending bank approval. No payment was attempted.";
