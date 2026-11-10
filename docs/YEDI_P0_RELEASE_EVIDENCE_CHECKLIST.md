# YediCihan P0 — release evidence gates (READ ONLY / NO-GO)

This PR remains **Draft, Request Changes, NO-GO**. These are instructions for authorized security/finance operators. They do not authorize a deployment, Stripe Live charge, production DB mutation, or secret disclosure. No donor record, card number, full bank reference or private key belongs in GitHub issues or PR logs.

## 1. Source and isolated CI evidence
- Record exact GitHub commit SHA of security PR #24, branch merged-integration candidate (#9/#19/#21/#24), and green latest-commit HTTP/unit/TypeScript/Next build runs.
- Real Next.js HTTP/isolated MongoDB acceptance covers Guest (authorized/unauthorized), DONOR owner/nonowner, STAFF, ADMIN, signed synthetic Stripe event ordering, amounts/currencies/ownership/reference mismatch, concurrency, official receipt proof, and retry fail-closed.
- Synthetic HMAC signatures only prove our handler rejects forged callbacks and applies business rules; they **do not** prove Stripe Test Mode or bank settlement.
- Never infer a live provider contract from generated unit-test events.

## 2. Stripe Test Mode evidence — authorized payment engineering only
- Capture **sanitized Test Mode** Stripe Event objects directly from a controlled, registered test endpoint (Stripe dashboard/CLI with test credentials only). Verify `livemode === false`, Stripe API version, signature with endpoint's test webhook signing secret, and provider event ID/delivery ID. Do not print the raw secret.
- Independently retrieve Test Mode PaymentIntent and, for recurring billing, the Test Mode Invoice and Subscription. Match stored local donation owner, providerOrderId, exact integer minor-unit amount received, currency, final provider state, and invoice/subscription linkage. Keep a private, redacted evidence reference with timestamps and artifact checksums. The public PR may cite only the sanitized test outcome.
- Test failed-attempt-then-succeeded, succeeded-then-failed, concurrent webhook replay, amount/currency/reference/owner mismatches, and settled payout vs merely approved/intended payment. Confirm financial totals exactly once, even across Mongo transaction write conflicts.
- **No real card or charge.** Stripe CLI synthetic trigger alone does not demonstrate the real application's original amount/owner bindings.

## 3. Bank settlement and historical receipts
- PayFor/QNB remains HOLD until a QNB merchant-hosted inquiry or bank-certified transaction result binds the exact order, amount, currency, settlement status and donor authorization server-side. **Do not create a public-facing final receipt based on PAID alone.**
- For historical Stripe/Albaraka/PayFor donations lacking authenticated settlement markers, the revised official receipt route responds 409; preserve existing donation rows. Finance must decide the approved read-only reconciliation procedure; do not backfill guessed proof.
- For Stripe subscriptions, receipt requires an invoice ledger entry with exact donor/subscription/currency/amount and a verified paidAt marker. Audit recurring first-invoice and renewal behavior separately.

## 4. Mongo indexes, uniqueness and rollback
- In an isolated DB after `prisma db push`, run `node scripts/yedi-security-readonly-evidence.mjs` with `CI_MONGO_ISOLATED=1`.
- On authorized VPS, this command is **read-only** and requires `YEDI_AUTHORIZED_READ_ONLY_INDEX_AUDIT=YES_I_HAVE_APPROVAL`. Confirm the exact database environment privately before invoking it. The tool prints only unique-index readiness and guest-key readiness, never connection strings.
- Required: unique index on `StripeInvoiceSettlement.invoiceId`; retain existing unique keys across migration. A new index should be applied only under a reviewed database change plan, after a backup and duplicate assessment. No script here creates indexes.
- Pre-release backup evidence: snapshot timestamp, restore test on a separate isolated system, verified release artifact checksum, and signed rollback owner. Never roll back a recorded financial settlement by changing old status blindly.

## 5. Guest-session rotation
- `DONATION_GUEST_ACCESS_SECRET` is mandatory and distinct from `NEXTAUTH_SECRET`; at least 32 bytes of independent entropy.
- On key rotation only, `DONATION_GUEST_ACCESS_PREVIOUS_SECRET` may verify old independently-keyed cookies for at most 24 hours, with `DONATION_GUEST_ACCESS_PREVIOUS_VALID_UNTIL` (Unix seconds). Remove old key after the cutoff.
- Older cookies previously signed via `NEXTAUTH_SECRET` cannot safely be silently trusted by the new key domain. Test an authenticated donor self-service recovery path or explicitly document guest re-verification before migration. Current code fails closed, potentially requiring support for affected guests.
- Do not commit or print actual key values or cookie tokens.

## 6. VPS process identity and rollback
- Run `bash scripts/yedi-vps-deployment-readonly-audit.sh` from the approved release checkout and set `YEDI_PM2_NAME` only to the confirmed YediCihan process. It checks PID and `/proc/PID/cwd`, then reports the repository and Git SHA of **that process path**, without PM2 environment dumps.
- Git HEAD alone is **not** proof of running binary revision. Compare with the process's immutable build artifact and release manifest (hash, timestamp, entrypoint). This cannot be established from GitHub CI.
- The rollback plan must identify last-known-good immutable artifact, database schema compatibility, release-symlink switch/PM2 restart procedure **for later approved execution only**, and post-rollback financial reconciliation.

## 7. Signoffs and external blockers
- Finance owner: bank and settlement evidence, legacy receipts, 14-currency routing, risk of recurring double billing.
- Security owner: guest authorization/recovery, key rotation, webhook replay proof, index readiness.
- Site operator: deployed VPS PID/cwd/hash, backups, rollback rehearsal, monitoring and access.
- No one should merge PR #24, enable unsupported PayFor, change main, or publish to VPS before all signoffs.

**Evidence status:** CI synthetic tests = measurable; real Stripe Test Mode signed fixture, actual merchant/bank settlement, VPS revision, production key migration, backup restoration and approvals = **NOT VERIFIED**.
