# يدي جيهان — Minberi Aksa read-only capability parity / transfer ledger

**Source:** `saladin76/minberiaksa@9a0c356d2bbab8de76951e9d2bdf2012523614ce`, read-only review on 2026-11-09. **No change to Minber repository or runtime.**

**Recipient reviewed branch:** `18b3f575d847f74af96f7f98a0574edeb94b9221`; existing integration `#9 + #10`. This document records a **preliminary pathname/code inventory**; matching paths do not prove feature equivalence, and absent paths do not prove missing functionality.

## Comparable admin surface

Minber exposes 40 direct admin section `page.tsx` paths in the compared root dashboard structure. يدي جيهان matches **19** of those exact paths and lacks **21** by pathname on the reviewed recipient branch. This is not a transfer completion ratio. Deeper screens, alternate routes, service tests and app-specific choices require a semantic audit.

## Source capabilities actually evidenced by files and release notes

1. Mixed one-time + daily/Friday/monthly donor checkout with separate allocations; explicit recurring plan principal, initial settlement and provider callbacks. **Payment-provider-specific; not generally portable.** Source doc: `docs/releases/mixed-cart-once-recurring-20261104.md`.
2. Paid-only donor/finance exports with original currencies, country labels, active-vs-unactivated plan state and Arabic/English export isolation. Source doc: `docs/releases/donation-report-details.md`.
3. Verified donor identity from email/WhatsApp/Google and guest conversion using explicit proof plus rate limited OTP. **Privacy-sensitive; cannot blindly transfer account linking**. Source doc: `docs/releases/donor-unified-login-20261104.md`.
4. Campaign send confirmation and table-row protection against portalled dialogs, plus signed Cloudinary PDF sample handling. Source doc: `docs/releases/communication-send-pdf-20261106.md`; source code: `app/(dashboard)/dashboard/communication/campaigns/_components/{CampaignRowActions,CampaignsTable}.tsx`.
5. Translation/SEO editorial draft review with unsaved content, structured editor insertion, separate save/confirm and field-scoped AI suggestions. Source doc: `docs/releases/editor-field-assistance.md`.
6. Attribution link builder with valid saved templates, placeholders, non-public destination guard, locale safe link handling. Source doc: `docs/releases/attribution-workspace-20261105.md`.
7. Dashboard payment, marketing, communication, operations, content archive and AI modules evidenced by implementation; older architecture maps may be superseded and are **not** accepted as proof of runtime readiness.

## Institution-specific queue and exclusions

- **P0 / existing blocker:** category create HTTP 500 and CI Prisma `DATABASE_URL` synthetic env; address PR #10 with data-safe diagnostics before Zakat al-Mal production content work.
- **P0 / content acceptance:** verify eight Gaza pages before editing, food open amounts, distinct image galleries, new Syria and Yemen projects, separate Zakat Gaza/Sudan/Yemen/Syria, 20% pricing change without double increases, all eight active locales and SEO.
- **P1 / code:** authorized content-editor create/SEO/traduction, smart image gallery, category public visibility, super-category hierarchy where absent, responsive campaign workflows and no-send confirmations; compare against PR #9/other historical PRs.
- **P1 / business:** donor CRM, attribution only from confirmed payments, accurate exports with original currency and localized countries, financial gateway isolation.
- **P2 / optional:** AI assistance, advanced reports, brand center, editorial planning, certificates; only if the institution requires them.
- **Do not import:** Minber Albaraka/PayFor account details, payment routing country rules, donor/project records, content/images, live dispatch rules or 19-language catalog.

## Completion contract for every transfer package

1. Inspect both current source and target *implementation*, not just filenames; record all data dependencies, route auth/permissions, locale assumptions, provider integration and expected UI states.
2. Preserve the target's existing behavior and business identity. Add targeted tests under synthetic fixtures, then Prisma/TS/Next CI and a protected Vercel Preview. No cross-institution donor data, IDs, images, slogans, account credentials or financial migrations.
3. One package per Draft PR targeted at the recipient's integration branch; link exact SHA and CI run results. **Do not touch the Minber repository**. No production publishing, sending, real debit/refund, schema changes or provider activation without separate release GO.
4. For unrelated gaps, document `EXISTS / NEEDS IMPROVEMENT / MISSING / NOT APPLICABLE / BLOCKED`, include route/API and test evidence rather than inferring from a path count.

**Current code port in this branch:** stop campaign row navigation on portalled confirmation click; regression test `tests/ported-systems/campaign-row-portal-navigation.test.mjs`. This is a narrowly scoped UI fix, not full site parity.
