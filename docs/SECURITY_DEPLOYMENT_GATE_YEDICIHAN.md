# YediCihan P0 release gate — server-controlled release only

**NO-GO**. This document is not a deployment authorization and must not be treated as evidence that a VPS was inspected. Never publish SSH credentials, environment variables, donor details or payment secrets in public reviews.

## Production identity (operator to verify on approved terminal)
- Run `bash scripts/yedi-vps-deployment-readonly-audit.sh` only from the known YediCihan release directory.
- Confirm Git origin is exactly AdhamRef/yedicijan, the running PM2/systemd service points at that release directory, and record the full deployed commit SHA privately.
- Confirm the production application host, HTTPS reverse proxy, Node version, process manager, database connection identity (without printing credentials), and monitoring/backup contacts. The code review has **not** established any of these facts from the remote host.
- The legacy Vercel bootstrap refers to another organization's project; retain the fail-closed PR #22. Vercel is not an acceptance prerequisite for this VPS.

## Pre-release security gates
- Independent review of PR #24 and actual HTTP isolated tests for unauthorized guest, owner, staff/admin, tampered/expired access cookies and no GET financial writes.
- Stripe **signed webhook only**: exact owner, order, paid amount and currency, paidAt compare-and-set and concurrent event protection.
- Subscription invoice reconciliation needs independent review and matching bank evidence before financial release.
- Regression tests for guest success/pending/receipt, donor account and eight locales. Verify browser cookie is Secure, HttpOnly, SameSite and never in URL.
- No real card numbers, live bank traffic or production donor tests.

## Operator-controlled rollback plan (not executed)
1. Before releasing, record a **known-good, running** commit, deployed artifact checksum, build artifact or release directory, PM2 process identity, and database schema/migration status.
2. Create a verified backup/snapshot under the organization's existing procedures. Do not assume `git reset --hard` is safe; it can destroy server-local changes and does not roll back financial data.
3. If approved for deployment later, use the actual VPS deployment mechanism and monitor errors and successful authorized donor flows. No cross-organization variables or bank switches.
4. On rollback approval, atomically restore the previously tested immutable release artifact/symlink and restart only the YediCihan service using the operator's documented procedure. Verify the running process cwd and commit, not just the Git HEAD of a random directory.
5. **Never undo completed financial transactions by reverting code.** Reconcile and preserve transaction/webhook audit trails before any data/schema rollback.
6. Keep rollback authority and access logs with the YediCihan operator, not a public GitHub issue.

## Evidence gaps
- No VPS terminal access is available in this ChatGPT execution. Deployed commit, true process manager, remote backup status and live bank merchant capabilities remain unverified.
- GitHub CI verifies the **candidate source tree only**, not the running production binary.

## Receipt / retry safety hold (PR #24 follow-up)
- Issuing an official PDF requires PAID + paidAt + an authenticated Stripe payment marker (one-time) or matching committed Stripe invoice ledger (recurring). Legacy transactions with missing provider proof, plus Albaraka/PayFor without an approved settlement attestation, are **blocked from official PDF generation pending manual reconciliation**. Do not fabricate proof or modify historical payment records to unblock.
- Browser-initiated retry is temporarily disabled with HTTP 409, even for a previously FAILED sentinel, until the relevant bank exposes an authenticated final-state inquiry. No replacement donation is created. The preexisting reference remains available for staff reconciliation, but must not be exposed to an unauthorized browser.
- Stripe payment_intent.payment_failed is a failed *attempt*, not a final donation verdict. Signed provider success with the exact donor, intent/order reference, amount and currency can settle the same attempt; paidAt transaction guards credit increments. A signed test fixture is not evidence of real financial settlement.

## Mandatory dedicated guest key and rotation
- Set DONATION_GUEST_ACCESS_SECRET to an independently generated high-entropy value of at least 32 bytes **via the actual YediCihan VPS secrets manager** before enabling new guest checkouts. Never reuse NEXTAUTH_SECRET, bank credentials, production database access, or another institution's key.
- Key rotation: set a new DONATION_GUEST_ACCESS_SECRET and temporarily set DONATION_GUEST_ACCESS_PREVIOUS_SECRET plus DONATION_GUEST_ACCESS_PREVIOUS_VALID_UNTIL (Unix seconds). The previous key verifies old cookies only until the cutoff, at most 24 hours ahead; it never signs new cookies. Remove the old key after this window and confirm old tokens are invalid.
- Tokens previously signed using the deprecated NEXTAUTH_SECRET fallback cannot be safely migrated silently to a new security domain. Allow authenticated ownership to work, and provide a separately reviewed authenticated donor recovery path for guest sessions whose old cookies become invalid. This is a release communication/compatibility gate, not permission to restore the insecure fallback.
- Do not print any of these key values in logs, GitHub workflows, screenshots or PR comments.
