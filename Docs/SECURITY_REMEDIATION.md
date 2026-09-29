# Stabilization checklist

Baseline: `2e18b650`. Repair branches: `fix/priority-1-security`, `fix/priority-2-foundation`, and `fix/priority-3-file-access`.
This document tracks implementation separately from operational acceptance. It does not
declare the application ready for production SaaS.

## Priority 1: security baseline

| Checklist item | Status |
| --- | --- |
| 1. Review, validate, branch, push, PR, fresh clone | Repair branch created; validation and publication recorded below |
| 2. CORS test and environment separation | Implemented; explicit test origins and production validation |
| 3. Frontend vulnerabilities | Dependency updates installed; npm audit reports zero vulnerabilities |
| 4. Teacher authentication | All three login paths share short-lived tokens with session versions |
| 5. Account enumeration | Generic recovery, resend, and public status responses; authentication IP limits also cover teacher login |
| 6. Rotate secrets and remove history | OPEN: historical Backend/.env confirmed; rotation status and coordinated rewrite remain outstanding |

Additional authentication fixes: teacher and institute password changes increment session
versions, profile edits use allowlists to protect privileged fields, and the frontend returns
users to login after a password change. OTP send cooldowns still suppress delivery but no
longer reveal account state through different response codes. Failed deliveries remain logged.

Dependency review: compatible updates were applied without `--force`; unused frontend jsPDF
was removed. Vitest and its UI were upgraded together to 4.1.11 and Vitest is now an explicit
development dependency. Backend jsPDF remains installed. CI checks both audits at high
severity, both linters, tests, and an explicit frontend production build. CI and build images
use Node 22. See the [Vitest advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9).

## Remaining order

Work through these milestones as separate reviewable changes. Do not implement subscriptions
or payments until the acceptance gate below is complete.

| Priority | Checklist items | Remaining work and acceptance |
| --- | --- | --- |
| 2 | 7. Tenant isolation | Implemented scoped API fixes and two-institute integration tests for existing resources, downloads, shares, logs and analytics. Notification read/update and subscription/payment APIs are absent. Raw public file paths remain Priority 3. |
| 2 | 8. Central issuance | Implemented one service for institute, teacher, bulk and legacy draft issuance; rendering/signing, reference validation, transaction commit and ledger are shared. Replica-set deployment is required. |
| 2 | 9. Idempotency and usage ledger | Implemented deduplication, transactional reservation/consumption/release ledger, concurrent-request tests and stale-worker recovery. PARTIAL: subscription allowance checks and purchased-credit reservation remain Priority 6 dependencies. |
| 2 | 10. Identity rules | Globally unique normalized account email, including teacher creation across roles; database uniqueness tested. Multiple institute memberships require a separate membership design. |
| 3 | 11. File access | Implemented authenticated file delivery, frontend blob previews, expiring/revocable share grants and email links; public verification excludes file access. Coordinated staging deployment/cache purge remains. |
| 3 | 12. Metadata versus storage | Models store image references rather than binary data. New certificate/QR references are relative paths on the existing persistent filesystem volume. Cross-host legacy path normalization and storage restoration remain staging checks. |
| 3 | 13. Upload validation | Implemented MIME/decoded-format agreement and exact logo extension checks; integration coverage includes template/assets/logo spoofing, dimensions, byte limits, generated filenames and failure cleanup. Image reencoding is not antivirus scanning; arbitrary documents stay unsupported. |
| 4 | 14. MongoDB upgrade | Choose Atlas or an authenticated private MongoDB 8 deployment; test migration and restoration using a copy of data. Do not attach an existing 4.4 volume directly to MongoDB 8. |
| 4 | 15. Fail-closed database config | Server startup already checks production configuration; remove local fallbacks from direct database/script entry points too. |
| 4 | 16. Persistent storage | Existing MongoDB/upload volumes need deployment verification; add persistent backup output and test rebuild survival. |
| 5 | 17. CI | Audit/build gates added in this branch. Secret scanning, dependency review, Compose validation and preflight automation remain; migration tests follow actual migrations. Configure required checks in GitHub. |
| 5 | 18. Separate environments | Provision separate staging/production databases, secrets, domains, storage and logs; exercise changes in staging. |
| 5 | 19. Monitoring | Connect availability, errors, resources, authentication failures, issuance failures, backups and TLS expiry to an alert destination. Payment and renewal alerts follow those features. |
| 6 | 20. SaaS models | BLOCKED by gate: Plan, Subscription, Payment, UsageTransaction, SubscriptionEvent, optional Invoice; snapshot purchased limits. |
| 6 | 21. Entitlements | Enforce teacher/template/issuance/bulk/analytics limits centrally; reserve credits atomically with a permanent ledger. |
| 6 | 22. Expiry rules | Keep existing verification and revocation available after subscription expiry; never delete data on expiry. |
| 6 | 23. Manual pilot | Implement super-admin payment recording/activation and institute subscription screens; test manual subscriptions with pilot institutes. |
| 6 | 24. PayHere | After the manual pilot, implement sandbox checkout, verified notifications, idempotency and payment history; security/UAT before production activation. |

## Acceptance gate

- [ ] Backend/frontend tests, lint, build, audits pass on the published branch and a fresh clone.
- [x] Teacher short-lived authentication and session revocation implemented.
- [x] Public recovery/status response disclosures corrected.
- [ ] Full tenant-isolation tests pass.
- [ ] Certificate files require controlled access.
- [ ] MongoDB production architecture and migration validated.
- [ ] Compromised secrets rotated and history cleanup coordinated/completed.
- [ ] Monitoring, staging and encrypted off-server backup restoration tested.

Rate limiting currently uses per-process memory. A shared limiter is required before scaling
to multiple backend processes. Generic HTTP responses do not prove constant-time behavior;
delivery timing should be tested in staging and moved to a queue if needed.

## Validation record

Workstation validation on 2026-09-29, Node 22.14.0:

| Check | Result |
| --- | --- |
| Backend tests | 87/87 passed across 10 suites |
| Frontend tests | 11/11 passed across 5 files |
| Backend audit | 0 vulnerabilities |
| Frontend audit | 0 vulnerabilities (previously 27) |
| Backend/frontend lint | Passed |
| Frontend production build | Passed; existing large-bundle warning remains |
| Diff whitespace check | Passed |

Frontend test workers timed out inside the filesystem sandbox; the standard command passed
with worker execution permitted. Docker is not available in the current workstation PATH;
container checks must run in CI or a Docker-enabled staging host. Fresh-clone validation and
published-branch CI results must also be checked before merge.

For the remaining credential work, use [SECRET_ROTATION.md](SECRET_ROTATION.md).

## Priority 2 validation

See [PRIORITY_2.md](PRIORITY_2.md) for the issuance protocol, API retry rules,
transaction-capable database deployment requirement, and remaining scope.
Local validation: backend unit tests 86/86 (the old mocked draft test is replaced by
real transaction coverage), replica-set integration tests 42/42, frontend tests 12/12,
both linters, the frontend production build, and both dependency audits passed (zero
vulnerabilities). The full tenant/file-access acceptance gate above stays open
until Priority 3 replaces raw public file delivery.

## Priority 3 and deployment order

PR #1 merged on 2026-09-29. PR #2 now targets main and remains draft pending actual
Atlas staging migration, transaction, restoration and persistence evidence.
See [PRIORITY_3.md](PRIORITY_3.md) for the controlled file protocol and
[ATLAS_STAGING.md](ATLAS_STAGING.md) for the outstanding staging gate.
Database/operational preparation, secrets and monitoring must precede Priority 6.
Implement manual subscriptions before PayHere. No Atlas provisioning or production
deployment has been performed by these code changes.
