# Manual subscriptions

The original isolated draft was authorized on 2026-10-01 and merged through PR #5.
Main now includes later receipt, trial, upgrade and notification work. The current workflow
is detailed in [PACKAGE_PAYMENT_FLOW.md](PACKAGE_PAYMENT_FLOW.md); production acceptance
and open-PR reconciliation are tracked in the [October 16 review](READINESS_REVIEW_2026-10-16.md).
Implemented features do not complete data recovery, backup, credential or deployment gates.

## Included workflow

1. Enable `SAAS_ENABLED=true` in the backend and `VITE_SAAS_ENABLED=true` when building the
   frontend in an isolated test environment using a MongoDB replica set. Code defaults are
   off, while the Dokploy Compose configuration explicitly enables both flags.
2. Start the backend normally so the new collections and unique indexes are created. Never
   enable billing against an existing deployment before verifying indexes and taking backups.
3. In the super-admin dashboard, open **Subscriptions** and initialize the three draft
   packages. Prices are stored as integer LKR minor units: 1,490,000 / 2,990,000 / 4,990,000.
   Limits are 100/500/1,500 certificates, 2/5/15 teachers and 2/5/10 templates respectively.
   Both supported features are initially included in every draft package; the admin can
   change availability for future purchases. Plans may be edited, hidden or created.
4. A verified institute selects a plan from **Subscription** or `/institute/subscription`.
   The request saves a price/limit/feature snapshot. The browser cannot submit its own price.
5. The institute uploads its private payment proof against configured bank instructions.
   The super-admin checks the actual transfer and current receipt version, enters its
   reference and exact received amount, then activates the pending request.
   The backend rejects mismatches and reused bank references. Payment, annual activation,
   initial credits and audit event commit atomically. Retrying cannot allocate twice.
6. Issue certificates normally. Individual, teacher, bulk and legacy draft issuance use
   the same transactional credit reservation/completion/release flow. Rendering remains
   outside the transaction. Consumed retries do not charge again, even after subscription
   expiry. Failed rendering or expiry during rendering releases the reservation.
7. The institute sees current status, usage, held/available credits, limits, dates, payment
   history and downloadable PDF payment receipts. The screen shows 75/90/100% usage and
   30/7/0-day expiry warnings. Durable workers send expiry and paid-invoice emails.
8. Renewal is a new request after expiry. Unused allowance does not roll over. Earlier
   subscriptions and ledger entries remain. Admins can suspend/resume an unexpired paid
   subscription or cancel a pending request; payment activation cannot be bypassed by
   a status change. Every exposed admin mutation records an audit event.

## Enforcement and operational details

- An active term is required for new issuance and creation of teachers/templates.
- Teacher/template quotas count all existing records, including inactive ones, so toggling
  activity cannot bypass a quota. Deletion frees a slot. The subscription write serializes
  competing resource creations across backend instances.
- Bulk issuance and new secure shares require the purchased feature. Existing verification,
  share resolution and revocation are not disabled by subscription expiry. Certificate email
  delivery creates a secure share and therefore requires the sharing feature.
- Issuance checks subscription status and expiry both when reserving and when committing.
  Consumed/reserved counters and the permanent ledger change in the same transaction.
  Revoking a certificate does not refund its credit.
- Expired issuance leases are recovered in bounded batches (100) during subsequent issuance
  or renewal requests, with operation fencing and release events. Large backlogs may require
  repeated requests or an operator-led recovery job.
- Separate unique indexes allow one pending request and one active/suspended paid subscription
  per institute, supporting paid upgrades. A permanent index limits registration to one trial.
  Multiple historical expired/cancelled subscriptions remain available. A suspended
  subscription is held for admin review even after its nominal expiry; it cannot be resumed
  after expiry. An administrator can explicitly close an expired term with no held credits
  after reviewing the suspension, allowing a new request. Early cancellation/refunds require
  the future policy.
- Feature flags are deployment controls, not tenant preferences. Do not switch the backend
  flag off on a running paid service: that restores the portal's unmetered behavior. Enable
  it only during a planned cutover after allocating entitlements to existing institutes.
- Basic API histories are bounded: 50 institute subscriptions/payments, 100 usage entries and
  200 admin subscriptions/events. The newer subscriber analytics endpoint is paginated;
  complete history export remains later work.

## Deferred scope

Scheduled downgrades, proration, extra-credit sales/adjustments, automatic paid renewal,
refund processing, payment reconciliation and PayHere remain deferred. Trials, paid
upgrades, revenue dashboards and expiry/invoice workers are implemented. Tax/legal
acceptance and deployed payment/delivery tests remain separate from PDF generation and
automated integration coverage. No card data is stored. Manual pilot acceptance and
operational readiness remain required before treating billing as production-accepted.
