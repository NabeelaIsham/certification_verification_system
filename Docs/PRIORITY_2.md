# Priority 2: institute isolation and issuance

Institute, teacher, bulk, and legacy draft issuance now use
`Backend/services/certificateIssuanceService.js`. The authenticated account determines
the institute. Active institute approval, teacher permissions, course assignment, and
student/course/template ownership are checked before rendering and again before commit.
Student, course, and teacher updates allow only supported fields. Template image paths
must belong to the institute. Account emails remain globally unique across all roles;
multi-institute memberships are not supported in this version.

## Issuance protocol

Clients send an `Idempotency-Key` header (16–128 letters, numbers, colons, underscores,
or hyphens). The UI retains a UUID while retrying unchanged input. Keys are scoped to
the institute; changing details with an existing key returns 409. A completed retry
returns the existing certificate with HTTP 200; new issuance returns 201. Older clients
without a header use a deterministic key derived from the normalized input.

Each attempt transactionally reserves an operation and a lock for the institute/student/
course. QR generation, rendering, and signing occur outside the transaction. A second
transaction saves the certificate, completes the student enrollment, consumes the
operation, appends the ledger entry, and removes the lock together. Generation failures
release the reservation. Expired five-minute leases can be recovered by a later request;
attempt numbers prevent an old worker from committing after recovery. Retries reconcile
uncertain commits before deleting files. Email failure does not undo issuance; delivery
can be retried using the existing email endpoint.

`CertificateIssuance` stores request state, `IssuanceLock` prevents overlapping issuance,
and `IssuanceEvent` records permanent reserved/consumed/released entries. The institute
can read its latest 100 entries at `GET /api/certificates/issuance/history`. There is no
ledger mutation API. These are issuance units, **not subscription credit balances**.
Purchased allowances, subscription validation, and atomic credit-limit enforcement
remain Priority 6 work and must join these same reservation/commit transactions.

Bulk requests run the same protocol per row and return individual success/failure
results. Reuse the batch key and identical row order for retries. Each row is atomic;
the entire batch is not one transaction. Existing active certificates also block
duplicate requests with different keys. Intentional reissuance after revocation needs
a new key. Legacy drafts receive a new certificate code when first issued. Regenerating
an already issued image does not consume another issuance unit.

## Database deployment requirement

MongoDB must support transactions: use Atlas or a configured replica set. The existing
`docker-compose.yml` still uses standalone MongoDB 4.4 and **cannot issue certificates
with this change**. Issuance returns 503 on standalone MongoDB, and production preflight
rejects it. Do not deploy this branch against that standalone configuration.

Before deployment, provision a separate transaction-capable staging database, restore
a backup there, set `MONGODB_URI` to its replica-set connection string, and run
`npm run preflight:production` from Backend. Run issuance and restoration checks before
switching production. Database migration, authenticated deployment, and upgrades remain
Priority 4; never attach an existing MongoDB 4.4 data volume directly to MongoDB 8.
See [MongoDB transaction requirements](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/).

## Verification and limits

Run `npm run test:integration` from Backend. The tests start an isolated MongoDB 8
replica set with disposable data, real signing/rendering, and mocked email delivery.
The first run downloads MongoDB; an installed executable can be selected with
`MONGOMS_SYSTEM_BINARY`. CI runs this suite as well as the existing checks.

Coverage includes two-institute access attempts, lists/exports/analytics/history,
teacher permissions, foreign assets and references, concurrent issuance, signing-key
initialization, retries, lease recovery, generation failure, commit rollback, bulk,
email failure, and legacy drafts. Notifications have no institute-facing read/update
API in this repository; subscription/payment APIs do not yet exist.

Public verification and token-based shares intentionally remain public. Raw generated
image and QR static URLs still need the coordinated file-delivery changes in Priority 3.
A process crash can leave orphaned generated files; lease recovery protects database
consistency, but periodic orphan cleanup is not implemented here. Database backups must
include the issuance collections and ledger along with certificates.
