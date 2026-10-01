# Manual subscriptions: isolated draft

The owner authorized this branch on 2026-10-01. Foundation repairs, verified backups,
staging acceptance, credential rotation and sequential foundation merges still block
production deployment. No Atlas migration or real bank payment was performed by this work.

## Included workflow

1. Enable `SAAS_ENABLED=true` in the backend and `VITE_SAAS_ENABLED=true` when building the
   frontend in an isolated test environment using a MongoDB replica set. Both default off.
   Compose forwards the frontend build flag; backend settings come from its protected env file.
2. Start the backend normally so the new collections and unique indexes are created. Never
   enable billing against an existing deployment before verifying indexes and taking backups.
3. In the super-admin dashboard, open **Subscriptions** and initialize the three draft
   packages. Prices are stored as integer LKR minor units: 1,490,000 / 2,990,000 / 4,990,000.
   Limits are 100/500/1,500 certificates, 2/5/15 teachers and 2/5/10 templates respectively.
   Both supported features are initially included in every draft package; the admin can
   change availability for future purchases. Plans may be edited, hidden or created.
4. A verified institute selects a plan from **Subscription** or `/institute/subscription`.
   The request saves a price/limit/feature snapshot. The browser cannot submit its own price.
5. Obtain bank instructions from the operator. The super-admin checks the actual transfer,
   enters its reference and exact received amount, then activates the pending request.
   The backend rejects mismatches and reused bank references. Payment, annual activation,
   initial credits and audit event commit atomically. Retrying cannot allocate twice.
6. Issue certificates normally. Individual, teacher, bulk and legacy draft issuance use
   the same transactional credit reservation/completion/release flow. Rendering remains
   outside the transaction. Consumed retries do not charge again, even after subscription
   expiry. Failed rendering or expiry during rendering releases the reservation.
7. The institute sees current status, usage, held/available credits, limits, dates, payment
   history and downloadable JSON payment acknowledgements. These are not tax invoices.
   The screen shows 75/90/100% usage and 30/7/0-day expiry warnings. It does not send emails.
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
  or renewal requests, with operation fencing and release events. This draft has no scheduled
  worker. Large backlogs may require repeated requests or an operator-led recovery job.
- One pending, active or suspended subscription per institute is enforced by a unique partial
  index. Multiple historical expired/cancelled subscriptions remain available. A suspended
  subscription is held for admin review even after its nominal expiry; it cannot be resumed
  after expiry. An administrator can explicitly close an expired term with no held credits
  after reviewing the suspension, allowing a new request. Early cancellation/refunds require
  the future policy.
- Feature flags are deployment controls, not tenant preferences. Do not switch the backend
  flag off on a running paid service: that restores the portal's unmetered behavior. Enable
  it only during a planned cutover after allocating entitlements to existing institutes.
- API histories are bounded: 50 institute subscriptions/payments, 100 usage entries and
  200 admin subscriptions/events. Full pagination/export is later work.

## Deferred scope

Paid upgrades/downgrades and proration, extra-credit sales/adjustments, trials, automatic
renewal, refunds/tax invoices, revenue dashboards, scheduled expiry/reminder/outbox workers,
payment reconciliation, PayHere and production rollout are not implemented. Confirm those
business rules before adding them. No card data is stored. Manual pilot acceptance and
legal/operational readiness remain required before charging real customers.
