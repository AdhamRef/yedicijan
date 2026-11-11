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


## Branch proof, code parity and independent release boundary (11 November 2026)

- The QA branch `integration/yedi-issue25-pr9-strict-qa-20261110` starts from PR #9 head `090cafa8dd211fbe0af05b4da8f69094df4c7dcb` and overlays Issue #25 code. It does **not** incorporate PR #24 or the security integration branch. The PR #26 implementation blobs on the inspected release heads were identical in admin API, editor, public loader, layout, tracking settings, validation and browser/unit tests; the QA workflow differs to enforce full strict TS on PR #9's independently validated baseline.
- The original independent PR #26 CI had **green browser tests but red build**, not an acceptable independent build. Failure occurred at Next `sitemap.xml` static generation because the synthetic MongoDB server was absent; the workflow now starts disposable MongoDB for its build job. Independent latest-commit CI must turn green before claiming the PR stands alone.
- Both PRs remain Draft/NO-GO. A green PR #9+Issue #25 QA build confirms **compatible composite source**, not that PR #26 can be merged independently until its own clean-branch CI passes.

## Privacy and GTM data ownership limitations

- Existing root `app/layout.tsx` still includes an unconditional Contentsquare script. This is independent of the managed Clarity/GTM consent cookie. It requires a consent policy decision and removal/gating before a production claim of privacy compliance.
- Existing `TrackingPixelBootstrap` eagerly activates `TrackingPixels` direct Meta/GA4/TikTok/X loading **before managed-tag consent**; `EngagementInstrumentation` and `lib/analytics.ts` can push URL, query, referrer and ad click identifiers to direct analytics. This is a concrete pre-consent exposure outside the new two-tag manager. Do not claim that the new cookie applies to all trackers, or that all routes and telemetry are safe, until the organization authorizes a unified cross-provider consent and PII filtering policy.
- A previously initialized Clarity/GTM runtime persists on client-side route navigation. The loader avoids first initialization on restricted paths, but does not prove pre-existing third-party scripts are fully unloaded or unable to observe protected pages on SPA transitions. Server-side privacy policy and browser network traces are required before deployment.
- The managed GTM runtime uses `yediGtmLayer`, whereas existing gtag/direct GA4 uses `dataLayer`. No new purchase is emitted by the managed loader; external GTM container triggers, especially automatic All Pages/GA4/Ads tags, remain uninspected and could duplicate events. Run Tag Assistant and audit every active and paused container tag, exception and conversion ID in authorized staging.
- The dashboard displays external connection as `not_verified`, which is accurate; a script tag does not prove recording or conversion acceptance.

## External acceptance checklist for approved staging (never live payments)

1. Inspect network before any consent: zero requests to Clarity and GTM expected from the *managed* loader, inventory all legacy Contentsquare/Meta/GA4/TikTok/X/Vercel calls separately; reject if policy forbids pre-consent trackers.
2. Accept/decline/revoke consent on public Arabic and Turkish routes, then navigate client-side into checkout/account/receipt and watch every outbound request. Confirm no donor names, email, phone, payment IDs, full URLs with secrets, payment amounts or card fields leak to third parties.
3. Open a synthetic public route after allowing consent. Check the registered Clarity project receives one masked test visit; compare request count and any visible DOM exposure in the real recording. Check 8 UI locale presentations and narrow mobile widths.
4. Use Google Tag Assistant preview on the *authorized test container*. Export an audit of each GA4/Ads/purchase tag and trigger, verify no duplicate `page_view`, `purchase` or Ads conversion across direct `gtag` and managed GTM; ensure there is a single confirmed-financial owner for each conversion.
5. Record redacted test evidence, sign off by privacy/security and marketing, then request a separate authorized release review. Do not change GTM Live, Stripe Live, VPS or production donor data during acceptance.
