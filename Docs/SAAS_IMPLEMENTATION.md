# VerifyAwards SaaS implementation contract

Status: foundation gate preserved by the project owner. Do not implement subscriptions on
the current unmerged branches. No payment integration, billing or automatic credit deduction
is enabled by this document.

## Release sequence

1. Resolve the data/key/file findings in OPERATIONS_READINESS.md. Complete Atlas staging
   application validation, deployment persistence and backup recovery evidence.
2. Review and merge PR #2, then retarget/review/merge PR #3 and the operations changes.
3. Verify credential rotation and coordinated Git-history cleanup; pass lint, tests,
   dependency audits and builds on the merged foundation.
4. Implement Plan, Subscription, UsageTransaction and SubscriptionEvent, then the central
   entitlement service and transactional credit enforcement on that validated main branch.
5. Implement audited super-admin management, institute subscription pages and manual payment
   activation with pilot tests. Introduce Payment records for bank payments and receipts.
6. Add locked scheduled jobs and notifications. Only after manual subscriptions pass
   acceptance should PayHere sandbox integration begin.
7. Complete security/UAT, operational and legal review before a controlled institute pilot.

## Proposed annual packages

These are the supplied proposal, not published prices or activated entitlements.

| Plan | Price (LKR) | Certificates | Teachers | Templates |
| --- | ---: | ---: | ---: | ---: |
| Starter | 14,900 | 100 | 2 | 2 |
| Professional | 29,900 | 500 | 5 | 5 |
| Business | 49,900 | 1,500 | 15 | 10 |

Baseline rules from the supplied specification: twelve-month terms; unused and extra
credits expire with their term; expired institutes cannot issue; existing verification
and revocation remain available; upgrades are immediate and downgrades take effect at
renewal. Purchased prices, limits and features are immutable snapshots. Plan edits affect
future purchases only. No stored card numbers or CVV.

Owner decisions needed before billing implementation: trial duration/allowance, extra-credit
prices, tax inclusion, refunds, grace period, upgrade pricing and credit arithmetic,
renewal timing, multiple institute administrators, teachers belonging to multiple institutes,
and feature availability per plan. Do not infer legally binding or financial terms from
UI defaults. An immediate upgrade must not silently reset consumed credits.

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
