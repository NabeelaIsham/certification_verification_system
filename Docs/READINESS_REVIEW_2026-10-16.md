# Readiness review — 2026-10-16

Reviewed local and GitHub `main` at `f5dd55b64864352fcb3710d22b1c8c0adb0e0d05`.
This is the baseline audit. See [subsequent local remediation](REMEDIATION_PROGRESS_2026-10-16.md)
for the student lookup, bundle splitting, deployment checks and pending rollout changes.
The supplied assessment mixes historical data findings, open PR metadata, and features
that have since reached main. Production acceptance remains incomplete.

This review used public GitHub metadata, commit comparisons, source inspection,
read-only Atlas queries, and anonymous HTTPS requests. It did not change database
records, signing keys, indexes, accounts, subscriptions, remote branches or deployment
settings, and sent no email/SMS. Only documentation was changed in the workspace.

## Certificate data: distinguish the databases

The September 30 migration evidence concerns the original `certverify` dataset and
its staging/restoration copies. Its 14 certificates included 3 signed and 11 unsigned
records, 4 certificates with missing institutes (one also missing its template),
26 absolute file references, and one signing-key validation failure. The October 1
recovery record established recovery of the original key and its public fingerprint;
it did not record an applied re-encryption migration.

A separate read-only inspection at **2026-10-16 08:42 UTC** used
`ATLAS_PRODUCTION_MONGODB_URI` from the local protected configuration and selected
database **`certiverxia`**. No URI, private key or recipient details are included here.

| Check | Observed result in `certiverxia` |
| --- | --- |
| Certificates | 1 signed, 0 unsigned |
| Certificate signature and issuer trust | 1 valid signature, trusted by the referenced institute |
| Signing-key records | 1 checked; validates with the locally configured encryption secret |
| Missing institute/student/course/template references | 0 |
| Cross-institute certificate references | 0 |
| Absolute / unsafe relative file references | 0 / 0 |
| Transaction-capable topology | Confirmed |
| Recovery/path migration audit records | None in this database |
| Subscription statuses | 1 active, 1 trial, 1 cancelled |

The same certificate was viewable through the live domain's public certificate page
and image endpoint. This supports consistency for that record, but does not establish
the exact Dokploy connection configuration or account for the older 14-certificate
dataset. A clean, different database is **not evidence that historical records were
repaired, retained or migrated**. The historical recovery/disposition gate stays open
until the original dataset and migration history are reconciled.

File-reference syntax was checked against database metadata; the VPS volume was not
inspected. Signing-key validation used the local configured secret, not a secret read
from the running container. Atlas network access lists and database-user privileges
were not available through these queries.

For historical recovery, preserve the original backup and signing identity, verify an
independently recoverable backup, and use the existing staging-only rewrap/path tools
after reviewing their dry runs. Restore missing institute/template records only from
authoritative evidence. Record an explicit policy for unsigned legacy records before
importing them into the current service. No replacement identities, invented institutes,
certificate deletion or automatic legacy re-signing was performed.

## PRs and current CI

GitHub metadata and local commit objects agree on these exact heads:

| PR | Latest head | Current state | CI / review consequence |
| --- | --- | --- | --- |
| [#2](https://github.com/NabeelaIsham/certification_verification_system/pull/2) | `72d399c9` | Merged October 1 | Ancestor of current main; old documents calling it pending/draft are stale. |
| [#3](https://github.com/NabeelaIsham/certification_verification_system/pull/3) | `67d5c37c` | Open draft; base `fix/priority-2-foundation` | [Latest CI failed](https://github.com/NabeelaIsham/certification_verification_system/actions/runs/37729575497): backend and frontend dependency-audit steps failed; container builds passed. |
| [#4](https://github.com/NabeelaIsham/certification_verification_system/pull/4) | `f636fd6b` | Open draft; base `fix/priority-3-file-access` | [Latest CI failed](https://github.com/NabeelaIsham/certification_verification_system/actions/runs/37729760169): backend and frontend dependency-audit steps failed; container builds passed. Credential exports also block acceptance. |
| [#7](https://github.com/NabeelaIsham/certification_verification_system/pull/7) | `0dfca580` | Open; base `main`; merge conflicts | No Actions runs or check runs were returned for this head. Resolve/reconcile the branch and obtain CI on the reviewed result. |

Main's [CI run 38868838766](https://github.com/NabeelaIsham/certification_verification_system/actions/runs/38868838766)
passed all **11 jobs**, completed October 16 at 07:42 UTC. These cover backend/frontend
lint, tests, full and production dependency audits, backend integration tests, frontend
build, and container validation. The container job passed both standalone and Dokploy
Compose checks and both frontend Nginx image builds. Main's green CI does not make the
different open PR heads green.

The commit graph matters as well as PR labels:

- PR #3's original controlled-file foundation (`a5068c64`) is already an ancestor of
  main. Its remaining commit contains student-portal/sharing UI and documentation changes.
  In current main, `StudentPortal.jsx` still contains simulated certificate records on
  the student dashboard route. Review those remaining changes against main, preserving
  the newer `/certificate/:code` sharing flow and centralized session client.
- PR #4's shared ancestor with main is `1229cc7c`. **Its only two commits absent from
  main add `.local-secrets/*.credential.xml` administrator credential exports.** They
  contain PowerShell credential/SecureString elements; their values were not displayed
  or decrypted. The core rewrap, path-migration and data-audit implementations already
  match main. Remove the credential artifacts from the proposed branch and reconcile
  the redundant PR; do not merge it simply to clear the open-PR list. Review the affected
  credential custody/rotation and published-history cleanup separately.
- Manual payment submission, approval and receipts already exist in main, with later
  trials, upgrades and invoice workers. PR #7 includes older payment and deployment
  implementations. Review unique changes and conflicts against current main, retain the
  newer behavior, and rerun CI before accepting any remaining changes.

GitHub reported **`main.protected = false`** and an **empty repository ruleset list**.
Required PR review, CI checks, approval dismissal, and force-push/deletion restrictions
are therefore still an outstanding repository configuration task.

## Live checks

Observed October 16, approximately 08:40–08:46 UTC, with normal TLS verification:

| Check | Result |
| --- | --- |
| Apex HTTPS health | 200; healthy; database connected; HSTS present |
| Apex HTTP | 301 to `https://certiverxia.com/` |
| `https://www.certiverxia.com/` | TLS verification fails: self-signed certificate |
| `http://www.certiverxia.com/` | 404, no redirect |
| Anonymous `/api/auth/me` | 401 |
| Existing certificate's `/certificate/:code` page | 200 HTML, certificate image and `og:image` present, `private, no-store` |
| Existing certificate's public preview image | 200 JPEG, `private, no-store` |
| Existing certificate's private download and QR endpoints | 401 without authentication |
| Existing certificate's raw generated-image and QR upload paths | 404 |
| Unknown public certificate page | 404 HTML |

Public certificate-code viewing is now intentional product behavior. A valid code can
provide public image access independently of a restricted `/share/:token` link. Token
expiry/revocation limits that token's access; it does not remove an active certificate's
separate public preview. Do not describe all certificate images as authentication-only.

Not established by these checks: authenticated cross-institute isolation on the live
deployment, concurrent issuance/payment retries, controlled-share expiry/revocation on
live test records, container-recreation persistence, SMTP/handset delivery, real receipt
review, alert delivery, backup schedules/age, off-server backup custody, restore success,
credential revocation, or Atlas network/user restrictions. Use designated test institutes
and approved recipients for acceptance; do not mutate existing certificates to test this.

## SaaS and code-quality claims

| Assessment item | Current code |
| --- | --- |
| Three packages | Defaults implemented: Starter LKR 14,900 / 100 certificates; Professional LKR 29,900 / 500; Business LKR 49,900 / 1,500. Actual published catalogue and business acceptance must be checked separately. |
| Certificate allowances and usage | Transactional reservation/consumption/release and usage ledger implemented across issuance paths. |
| Manual subscriptions and receipt approval | Implemented, including private proof upload, exact-amount/version checks, rejection/resubmission and idempotent allocation. |
| Admin management | Packages, suspension/resumption, renewals, payment history, subscriber analytics and PDF receipts implemented. |
| Additional subscription behavior | Registration trial, paid upgrades, expiry notices and durable paid-invoice email jobs implemented. See `PACKAGE_PAYMENT_FLOW.md` for current behavior. |
| PayHere | No integration found; remains deferred. |
| Browser JWT storage | HttpOnly cookie sessions implemented; Secure in production, SameSite=Lax, explicit Origin/header CSRF checks. Remaining token-storage references remove old tokens or are tests. |
| Axios | Production source imports Axios through the configured shared client. |
| Refactoring | Listed large files reduced: verification page 12,243 bytes, template creator 9,617, certificate management 5,541; teacher/admin entry controllers 422/322 with extracted modules. Further maintainability work is optional. |
| Empty placeholders | No tracked zero-byte JS/JSX/CSS source files found in Backend/Frontend. Nonempty demo code still exists in the student portal. |
| SVG assets | Favicon 87,624 bytes; logo 318,311 bytes. Already reduced from the original exports; further optimization and bundle splitting remain possible. |
| CI checkout | Both uses are already v7. |

These are implemented features, not proof of production acceptance. Local protection,
concurrency and recovery tests use disposable databases; the current hosted CI passed.
No application code changed during this review, so its test results remain attributable
to the exact main commit above rather than to a new local test run.

## Remaining release decisions

1. Fix www DNS/router/certificate handling, enable main protection, and remove credential
   artifacts from pending publication. Verify exposed credentials are revoked and coordinate
   historical-secret cleanup; environment-file history remains reachable in main.
2. Account for the historical certificate dataset and approve its recovery/legacy policy.
   Keep historical findings open separately from the clean current-database inspection.
3. Reconcile each open PR with main and require green CI on the actual reviewed commit.
4. Collect deployed persistence, isolation/retry, controlled-share, delivery/payment,
   backup/restore and monitoring evidence before treating the institute pilot as accepted.

The application is substantially beyond the early SaaS foundation, but the available
evidence does not justify declaring the production installation fully ready or recoverable.
