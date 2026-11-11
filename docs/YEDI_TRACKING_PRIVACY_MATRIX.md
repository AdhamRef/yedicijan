# YediCihan Tracking Privacy Matrix (11 Nov 2026) - Draft / NO-GO

| Script | Source | Purpose | Consent required | Routes | Disable |
|---|---|---|---|---|---|
| Contentsquare | app/layout.tsx; root external script removed in this PR | Replay analytics | Explicit opt-in and legal/provider approval | Public nonsensitive only after review | Currently disabled at root; audit GTM for re-injection |
| Clarity | ManagedMarketingTags, @microsoft/clarity | Masked session analytics | yedi_analytics_consent=granted | Public non-account/payment/dashboard | Admin toggle; deny + reload |
| GTM | ManagedMarketingTags, isolated yediGtmLayer | Tag manager | Explicit opt-in; container rules separately audited | Public non-account/payment/dashboard | Admin toggle; deny + reload; disable container |
| Meta | Legacy TrackingPixels and TrackingPixelBootstrap | Marketing attribution | Marketing consent not yet established across legacy path | Public and canonical verified conversion only | Legacy config and consent enforcement needed |
| GA4 / Google Ads | Legacy TrackingPixels and gtag | Analytics / attributed purchase | Analytics/ad consent as applicable | Public and canonical financial dispatcher only | Legacy config, consent mode and tag audit |
| TikTok | Legacy TrackingPixels | Attribution | Marketing consent | Public nonsensitive | Consent and legacy config |
| X | Legacy TrackingPixels | Attribution | Marketing consent | Public nonsensitive | Consent and legacy config |
| EngagementInstrumentation | Client hooks and lib/analytics.ts | Nonfinancial engagement | Analytics opt-in; NOT yet enforced on every hook | Public nonsensitive | Guard listeners/dispatch |
| Vercel Analytics | Root layout Analytics component | Traffic analytics | Evaluate provider/privacy obligations | Review all routes | Remove or consent-gate |

## Code changes
- Contentsquare unconditional root script removed.
- Engagement dispatcher now allowlists event names and fields, dropping URL query strings, free-text ad click identifiers, referral URLs and outgoing hrefs.
- Clarity identity dispatch through lib/analytics is disabled.
- Existing purchase/conversion dispatcher is untouched; managed GTM does not send purchase.

## External acceptance / NO-GO
- Browser Network audits before consent, after consent, after withdrawal, and on account, auth, checkout, payment, success, failed, dashboard pages.
- Inspect actual GTM container triggers for automatic pageviews, GA4, Meta and duplicate purchase. Review all direct pixel/gtag calls; synthetic pointerdown is not consent.
- Clarity/Contentsquare site ownership, masking, replay and retention approval; approved consent-mode handling.
- Source-level no-leak claim cannot be generalized to all legacy tags, which have not been independently verified.
- Independently run Chromium, HTTP, strict TypeScript and Build on latest PR SHA; compare against PR9 overlay. Do not merge or deploy.

## P0 follow-up, source changes pending acceptance
- Central consent authority: lib/tracking/consent.ts. Missing and denied consent block optional script load and engagement emission, even after pointerdown, scroll and timeouts.
- Legacy TrackingPixels now loads only on public routes with explicit granted consent; TrackingPixelBootstrap no longer synthesizes pointerdown.
- EngagementInstrumentation dispatch is guarded; the analytics dispatcher also limits event fields, and direct Clarity identity forwarding is disabled in that adapter.
- All root and locale unconditional Vercel Analytics/SpeedInsights mounts are removed, pending a deliberate approved consent integration.
- Consent withdrawal checks legacy pixels in addition to managed tags and triggers full page reload to unload already injected runtimes. Entering a sensitive SPA route after loading scripts triggers hard reload; verify this behavior with Chromium.
- GA4/dataLayer legacy enrichment no longer includes raw email, phone, name, birth date, external ID or other donor fields. Generic canonical page telemetry no longer forwards query strings or referrer URLs. Financial/payment verification and server settlement are unchanged.
- TODO for independent acceptance: verify all languages, private route transitions, mobile, exact network requests after withdrawal, settings save/disable, duplicate purchase triggers inside the external GTM container, and absence of PII in URLs and event payloads.
- IMPORTANT: browser financial conversion attribution may differ after gating optional pixels. Server settlement proof is unchanged; quantify attribution impact and confirm the canonical server purchase signal independently before releasing.
- CI workflow watches newly changed tracking files for TypeScript errors; full strict TypeScript on main may still have unrelated baseline errors. Draft / NO-GO.
