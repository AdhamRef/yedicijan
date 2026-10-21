/**
 * The site's public origin, for building absolute URLs that leave the server —
 * payment-gateway return URLs, Stripe success/cancel URLs, webhook endpoints,
 * redirects we hand to a browser.
 *
 * Deriving these from the incoming request is unsafe behind a reverse proxy.
 * Next resolves `new URL(req.url).origin` from the `Host` header
 * (`shared/lib/get-hostname.js`) and the `x-forwarded-proto` header
 * (`server/base-server.js`). nginx's default is `proxy_set_header Host
 * $proxy_host`, which sends the *upstream* address — so a proxy that forwards
 * `X-Forwarded-Proto: https` without overriding `Host` makes every one of those
 * URLs come out as `https://localhost:3000`, and a donor following one lands
 * nowhere.
 *
 * APP_URL is therefore authoritative, and the request is only a fallback for
 * local development where no proxy sits in front.
 */
export function publicOrigin(req: { url: string }): string {
  const configured = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(req.url).origin;
}
