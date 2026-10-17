# VerifyAwards SaaS implementation contract

Status (2026-10-16): PR #2 and the original SaaS PR #5 are merged. Main includes manual
subscriptions, transactional allowances, private receipt approval, registration trials,
paid upgrades, subscriber analytics and expiry/invoice email workers. See
[PACKAGE_PAYMENT_FLOW.md](PACKAGE_PAYMENT_FLOW.md) for current behavior and the
[readiness review](READINESS_REVIEW_2026-10-16.md) for current CI, PR and deployment evidence.
The original October 1 isolated-development approval did not waive production acceptance.
PayHere remains deferred.

## Release sequence

1. Resolve the data/key/file findings in OPERATIONS_READINESS.md. Complete Atlas staging
   application validation, deployment persistence and backup recovery evidence.
2. Reconcile remaining PR #3/#4/#7 changes against main. PR #2 is merged; core file and
   operations safeguards are also already in main. Remove credential exports from PR #4
   and require passing checks on any newly reviewed commits.
3. Verify credential rotation and coordinated Git-history cleanup; pass lint, tests,
   dependency audits and builds on the merged foundation.
4. Validate the implemented Plan, Subscription, UsageTransaction, SubscriptionEvent and
   Payment flows and entitlement enforcement on designated deployed test institutes.
5. Validate super-admin management, institute subscription pages, private proof review,
   payment receipts and retry-safe activation with pilot tests.
6. Validate scheduled jobs, notifications and actual delivery. Only after manual subscriptions pass
   acceptance should PayHere sandbox integration begin.
7. Complete security/UAT, operational and legal review before a controlled institute pilot.

## Proposed annual packages

These package defaults were confirmed for the original draft. Later implementation adds
a 14-day registration trial; automatic paid renewal remains absent. Packages become
visible when an administrator initializes the catalogue in a
SaaS-enabled environment. No packages or subscriptions are seeded into the existing database.

| Plan | Price (LKR) | Certificates | Teachers | Templates |
| --- | ---: | ---: | ---: | ---: |
| Starter | 14,900 | 100 | 2 | 2 |
| Professional | 29,900 | 500 | 5 | 5 |
| Business | 49,900 | 1,500 | 15 | 10 |

Baseline rules from the supplied specification: twelve-month terms; unused and extra
credits expire with their term; expired institutes cannot issue; existing verification
and revocation remain available; upgrades are immediate and downgrades take effect at
renewal in the original proposed scope. Current paid upgrades charge the full new annual
price, start a new term and allowance, retain the old ledger, and do not prorate/carry over.
Downgrade scheduling is not implemented. Purchased prices, limits and features are immutable snapshots. Plan edits affect
future purchases only. No stored card numbers or CVV.

Business acceptance must confirm the implemented trial/upgrade/renewal terms and actual
published prices/features. Extra-credit pricing, tax treatment, refunds, grace periods,
multiple institute administrators and cross-institute teacher membership remain separate
scope decisions. Do not infer legally binding or financial terms from UI defaults.
Upgrades must retain historical consumed credits and ledger records.

## Invariants and acceptance tests

- A permanent usage ledger records allocations, reservations, consumption, release,
  adjustments and refunds. Counters must reconcile to that ledger.
- Integrate credit reservation with the existing centralized issuance reservation and
  completion transactions. Rendering remains outside the database transaction; do not
  keep a transaction open while generating files or delivering messages.
- Retries consume a credit once, failed rendering releases it, expired leases recover it,
  and concurrent/bulk issuance cannot exceed the allowance. Test crash/uncertain-commit
  reconciliation as well as ordinary failures.
- Every institute/teacher/legacy issuance path shares enforcement. Teacher and template
  limits need concurrency-safe enforcement too. An institute cannot access another's
  subscription, payment, receipt or usage record.
- Every super-admin mutation creates an audit event. Manual bank-payment approval must
  activate and allocate exactly once, even under concurrent requests or retries.
- Expiry never disables public verification or required revocation. Test snapshot
  immutability, renewal, upgrades, deferred downgrades and negative credit adjustments.
- Scheduled reminders, expiration, reconciliation and cleanup use leases and idempotent
  effects across workers. Test restart/retry behavior and reminder uniqueness.
- PayHere must use server-selected prices, verified server notifications, exact amount/
  currency/order checks and idempotent activation. Browser return pages never activate.
  Add invalid-signature, amount mismatch, duplicate callback and refund tests at that phase.

UI scope: public pricing, institute plan/status/limits/usage/payment history/receipts,
75/90/100% usage warnings and 30/7/0-day expiry notices; super-admin plan/subscription
management, revenue/usage/renewal dashboards and administrative notes.

Operational scope: isolated environments, TLS, restricted Atlas access, persistent private
files, encrypted off-server backups, monitored restore drills, alerts and rollback.
Hostinger KVM 2 and Atlas Flex are proposed in the supplied document, not provisioned
services or approval to purchase. Policies and Sri Lankan data-protection review remain
separate acceptance work; this technical contract is not a legal review.
