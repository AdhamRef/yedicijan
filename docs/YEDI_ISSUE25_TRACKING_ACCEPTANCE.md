# YediCihan Issue #25 — Clarity / GTM release checks

**DRAFT / NO-GO; tracking-only changes, no payment changes.**

## Architecture and admin access
- Manage in `/dashboard/platform-connections/tracking`; do not move or delete the existing `/dashboard/pixels` settings.
- `GET /api/admin/tracking/integrations` requires platformConnections (or ADMIN).
- `PUT /api/admin/tracking/integrations` requires platformConnectionsManage (or ADMIN), a same-origin JSON request, and strictly validated Clarity and GTM IDs. All changes are logged as `TRACKING_MANAGED_TAGS_UPDATED`, without secrets.
- The same MongoDB `TrackingSettings` document stores tag identifiers, enabled flags and update times without touching Meta Pixel, GA4, TikTok, Ads or server-side conversion credentials.
- Response intentionally contains only public project/container IDs, booleans, and timestamps. **Configured, detected in browser, and verified externally are separate concepts.** No saved ID is treated as an API connection check.
- Prior hard-coded project/container IDs are preserved as legacy *defaults* until an explicit database save; after the first save an explicit disabled flag always wins.

## Public privacy and script ownership
- The single `ManagedMarketingTags` component replaces the legacy root MicrosoftClarity/DeferredGTM mounts and the unconditional GTM no-script iframe. It never runs in the dashboard or login/receipt-related routes.
- Analytics consent defaults to **not granted**. The multilingual consent prompt uses an explicit visitor choice saved in a SameSite cookie; rejecting prevents Clarity/GTM script injection and withdrawing consent reloads to unload injected tags.
- Clarity page content is marked `data-clarity-mask` before initialization, no donor identifier is sent or set. On opt-in it uses Clarity ConsentV2 with analytics granted and ad storage denied. Provider-side privacy settings must be reviewed independently.
- GTM loads only one validated container per page, using `yediGtmLayer` and no donation, payment, purchase, email or phone properties. Existing GA4/Ads handlers continue using their original paths; *no new browser purchase emitter is added*. The managed container may still have independently configured pageview/purchase tags — **audit container rules before production activation**. A separate layer does not establish that all external GTM tags behave correctly; review Google Tag Assistant traces.
- Other pre-existing scripts such as Contentsquare and direct Meta/GA4 pixels were not reengineered here. Their broader consent posture requires an independent privacy assessment; this PR does **not** claim entire-site consent compliance.

## Actual isolated acceptance
- CI MongoDB 7 on `127.0.0.1` and the synthetic Next.js server use no production credentials.
- GET unauthenticated 401; DONOR 403; STAFF with view permission GET 200/PUT 403; STAFF with manage permission and ADMIN can save. Malformed IDs, HTML/script injection and cross-origin PUT are rejected. Verify the original Facebook/GA4 credentials remain unchanged and never occur in public/admin responses.
- Save -> reload -> persisted values confirmed both by DB query and public config. Disable -> re-read -> false, and no script loads in a new browser context with consent.
- Playwright Chromium checks desktop dashboard, English editor and Arabic mobile public site, consent before/after, exactly one managed GTM script, masked body and zero donation/purchase pushes into the GTM-managed layer.
- Synthetic screenshots are uploaded as GitHub Actions artifacts. They do not prove a deployed VPS.
- UI copy supports ar/tr/en/fr/id/pt/es/de, with direction switching. Language-specific visual acceptance for all eight locales is a release signoff task if CI does not explicitly exercise every one.

## External gates
- Authorized staging URL under YediCihan only; inspect Clarity `clarity.ms` and GTM `gtm.js` network requests *after opt-in* and confirm no duplicates on navigation and device changes.
- Verify actual Clarity project ownership and dashboard access; provider-side recording receipt cannot be inferred from successful script injection.
- Independently inspect GTM container tags/triggers for automatic pageview and GA4/Google Ads purchase duplication, especially on `/success` and `/donation-pending`. Transaction attribution must originate from confirmed financial events.
- Verify data-protection requirements across all pre-existing trackers and explicit consent/revocation. No donor PII, PAN, payment intent secrets or transaction references may enter marketing tags.
- Release engineering: actual VPS running PID, commit/artifact hash, backup and tested rollback. Vercel is **not** the production hosting gate and the old wrong-organization workflow stays disabled.
- PR #24 is a separate security/finance NO-GO. Do not merge this tracking PR into its security fixes or publish either until both independent approvals.

## Evidence gaps (not claimed)
Provider verification, consent law review, authorized staging network trace, all-locale visual signoff, and VPS running commit remain outstanding even if isolated CI is green.
