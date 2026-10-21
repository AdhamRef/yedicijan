/**
 * Which gateway a given donation is charged through.
 *
 * Routing is fixed, not configurable — there is no "main gateway" choice any more:
 *
 *   - **PAYFOR**   (Ziraat Katılım 3D Secure) — one-time donations in Turkish lira.
 *   - **ALBARAKA** (Albaraka Türk 3D Secure)  — every other one-time donation.
 *   - **STRIPE**   — monthly subscriptions only, and nothing else.
 *
 * Stripe was removed from one-time donations entirely. It survives for monthly
 * because it is the only gateway here that can bill a second cycle: both 3D Secure
 * rails authenticate a single transaction and hand back no reusable credential, so
 * a recurring charge is simply not expressible through them.
 *
 * ALBARAKA_RECURRING_ENABLED does not change this: Albaraka has no documented
 * recurring API for this merchant, so monthly stays on Stripe either way.
 *
 * `payforEnabled` is the one remaining switch. Turning PayFor off doesn't fall back
 * to Stripe — lira donations move to Albaraka, which charges in TL anyway.
 */

/** Gateway actually used to charge a specific donation. */
export type ResolvedGateway = "ALBARAKA" | "PAYFOR" | "STRIPE";

export type GatewayResolutionInput = {
  /** Admin switch for the PayFor rail. When off, lira donations go to Albaraka. */
  payforEnabled: boolean;
  /** ISO currency the donor is giving in, e.g. "TRY". */
  currency: string;
  /** Monthly donations create a subscription and can only run on Stripe. */
  donationType?: "ONE_TIME" | "MONTHLY" | null;
};

export function resolveGateway({
  payforEnabled,
  currency,
  donationType = "ONE_TIME",
}: GatewayResolutionInput): ResolvedGateway {
  // The only remaining Stripe case. Neither 3D rail can bill the next cycle.
  if (donationType === "MONTHLY") return "STRIPE";
  if (payforEnabled && String(currency || "").toUpperCase() === "TRY") return "PAYFOR";
  return "ALBARAKA";
}

/** Lower-case name used by the analytics/pixel layer. */
export function gatewayAnalyticsName(
  gateway: ResolvedGateway
): "stripe" | "albaraka" | "payfor" {
  return gateway.toLowerCase() as "stripe" | "albaraka" | "payfor";
}

/** True when the gateway needs raw card inputs rendered on our own checkout step. */
export function gatewayUsesOwnCardForm(gateway: ResolvedGateway): boolean {
  return gateway === "PAYFOR" || gateway === "ALBARAKA";
}
