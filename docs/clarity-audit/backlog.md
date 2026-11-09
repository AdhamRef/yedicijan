# Issue-ready follow-up backlog — YediCihan Clarity

This backlog is independent of the source-only audit at `/home/runner/work/yedicijan/yedicijan/docs/clarity-audit/2026-11-02-to-09.md`. No item below is a claim that a production defect was observed.

## P0 — Confirm measurement ownership and access boundaries

**Title:** Verify YediCihan Clarity project ownership, host coverage, and duplicate initialization

**Acceptance criteria:**
- Confirm the canonical production host for `yedicihan.org` and `www.yedicihan.org`.
- Verify the effective production project ID from the approved deployment configuration and confirm the Clarity project’s allowed/observed hosts.
- Independently verify whether Gözbebekleri uses the same project; keep its sessions and metrics separate.
- Inspect the live GTM container for Clarity initialization and record the result without changing IDs or container configuration.
- Document evidence source and verification date without publishing credentials, session links, or raw identifiers.

## P1 — Complete the authorized seven-day behavioral review

**Title:** Review YediCihan donation and campaign sessions for 2026-11-02–2026-11-09

**Acceptance criteria:**
- Use the exact interval in `/home/runner/work/yedicijan/yedicijan/docs/clarity-audit/2026-11-02-to-09.md`; report export coverage, session/replay denominators, and every selected sampling stratum.
- Inspect available dashboard and recordings filters, daily/hourly trends, route/device/browser/OS/country/channel, and evidence-based bot/acquisition distinctions.
- Inventory all available Clarity built-in, custom, and Smart Events separately from source-code event names; inspect replay Details/Event timelines and mark export-only rows versus replays actually watched.
- Prioritize Gaza winter projects, categories/Zakat, amount controls, carts, checkout, Albaraka 3D/PayFor/Stripe return, pending/failure/confirmed paths, locale switches, mobile forms, and bounce/duplicate-event hypotheses.
- Record only observed, privacy-safe findings with normalized route, time slice, device/browser, event/time offset, keyed evidence reference, severity, impacted/inspected counts, repro steps, business consequence, hypothesis/reproduction distinction, and proposed fix.
- Never infer paid settlement from a thank-you page or analytics event; use only separately permissioned aggregate finance evidence.

## P1 — Review URL/referrer and traffic-cohort telemetry

**Title:** Assess whether Clarity/GA4/GTM engagement telemetry exposes URL or referrer parameters

**Acceptance criteria:**
- Using approved configuration and a synthetic browser session, determine which sinks receive click IDs, UTM values, full referrers, route search strings, and outbound URLs.
- Verify actual retention/processing policy and avoid copying live identifiers into findings.
- Evaluate whether `is_paid_traffic` reflects verified acquisition or only tag presence.
- Make no instrumentation, attribution, ads/pixel, provider, or logging change without separately reviewed scope and QA.

## P2 — Validate engagement event semantics and duplicates

**Title:** Reconcile custom Clarity engagement events with built-in Clarity, GA4, and GTM events

**Acceptance criteria:**
- Compare the custom pointer-burst `rage_click` definition with Clarity’s built-in rage-click signal and review dead clicks, quick backs, excessive scroll, form errors, repeated submissions, and JavaScript errors.
- Inventory GA4/GTM/Clarity definitions and identify actual duplicates with evidence rather than name similarity.
- Keep purchase attribution and payment-provider configuration unchanged; do not create synthetic Purchase/Donate events.

## P2 — Assess donation journey UX and heatmaps

**Title:** Review donation funnel heatmaps and mobile/locale usability after access is available

**Acceptance criteria:**
- Inspect heatmaps/scroll-click clusters for donation landing, project/category, cart, form, checkout, and error routes across the eight enabled locales (`ar`, `en`, `fr`, `tr`, `id`, `pt`, `es`, `de`) and mobile/desktop.
- Separate traffic, intent, checkout initiation, provider return, and independently confirmed settlement denominators.
- Report no finding without observed evidence and provide reproducible, privacy-safe steps for any confirmed defect.
