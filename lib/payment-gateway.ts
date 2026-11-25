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
