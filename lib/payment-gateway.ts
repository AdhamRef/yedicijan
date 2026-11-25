/**
 * Which gateway a given donation is charged through.
 *
 * Every donation is one-time. Routing is fixed, not configurable:
 *
 *   - **ALBARAKA** (Albaraka Türk 3D Secure)  — donations in Turkish lira.
 *   - **PAYFOR**   (Ziraat Katılım 3D Secure) — every other currency
 *                  (converted to TRY and charged in lira).
 *
 * `payforEnabled` is the one remaining switch. Turning PayFor off moves every
 * donation to Albaraka, which charges in TL anyway.
 */

/** Gateway actually used to charge a specific donation. */
export type ResolvedGateway = "ALBARAKA" | "PAYFOR";

export type GatewayResolutionInput = {
  /** Admin switch for the PayFor rail. When off, every donation goes to Albaraka. */
  payforEnabled: boolean;
  /** ISO currency the donor is giving in, e.g. "TRY". */
  currency: string;
  /** Accepted from the shared codebase's callers; Yedicihan routes by currency only. */
  mainGateway?: unknown;
  donationType?: string | null;
  forceStripe?: boolean;
};

export function resolveGateway({ payforEnabled, currency }: GatewayResolutionInput): ResolvedGateway {
  const c = String(currency || "").toUpperCase();
  if (c === "TRY" || c === "TL") return "ALBARAKA";
  return payforEnabled ? "PAYFOR" : "ALBARAKA";
}

/** Lower-case name used by the analytics/pixel layer. */
export function gatewayAnalyticsName(gateway: ResolvedGateway): "albaraka" | "payfor" {
  return gateway.toLowerCase() as "albaraka" | "payfor";
}

/* Kept for the shared codebase's routing modules. Yedicihan routes by currency in
   `resolveGateway` above; Stripe is gone, so a stored main gateway parses to PayFor. */
export type MainGateway = "ALBARAKA" | "PAYFOR";
export const MAIN_GATEWAYS: readonly MainGateway[] = ["ALBARAKA", "PAYFOR"] as const;
export function isMainGateway(value: unknown): value is MainGateway {
  return value === "ALBARAKA" || value === "PAYFOR";
}
export function parseMainGateway(value: unknown): MainGateway {
  return isMainGateway(value) ? value : "PAYFOR";
}
/** Both gateways take the card on the bank's 3D page, not in our own form. */
export function gatewayUsesOwnCardForm(_gateway: ResolvedGateway): boolean {
  return false;
}
