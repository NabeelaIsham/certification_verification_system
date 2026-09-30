# Atlas staging acceptance gate

Status on 2026-09-30: the supplied Atlas cluster is reachable (MongoDB 8.0.34).
The local `certverify` database (8.0.5) was backed up and migrated into
`certverify_staging_20260930`, then independently backed up and restored into
`certverify_staging_restore_20260930`. Both copies exactly matched all 12 source
collections, 111 documents, collection options and indexes. Transaction commit and
rollback passed on both Atlas copies. No application connection settings were changed.

PR #1 is merged; PR #2 targets main and remains draft. Full staging acceptance is still
blocked by existing source-data issues and application/operational validation below.

1. Create a separate Atlas staging project/cluster with the approved cloud region and tier.
   Restrict the IP access list to the staging host and operator IPs. Create a database user
   scoped to `certverify_staging`; keep production and staging secrets separate. Store the
   URI in the host/CI secret store, never in Git, chat, command history or test output.
2. Install MongoDB Database Tools. Take an authorized consistent source backup, retain the
   original, and restore into the empty staging database. For the old standalone source,
   pause application writes for the backup. Use a database/version-compatible logical
   migration path; do not reuse the MongoDB 4.4 data volume with MongoDB 8. Validate the
   supported migration path for the actual source version before restoring real data.
3. Restore the upload volume too. Compare collection counts and required indexes, check
   certificate-to-student/course/institute references and file availability, and normalize
   old absolute file paths for the staging host. Signing-key encryption material must be
   handled through the secret store so existing signatures can be validated. Disable live
   recipient email/SMS delivery in staging.
4. Set `STAGING_MONGODB_URI` securely with database `certverify_staging`, then run
   `node scripts/validateStagingTransactions.js` from Backend. It commits and aborts writes
   in its own randomly named temporary collection and removes only that collection.
   It never falls back to `MONGODB_URI`. This probe alone is not migration validation.
5. Set the staging application's production-mode environment and run
   `npm run preflight:production`. Exercise issuance, simultaneous retries, template preview,
   private downloads, controlled shares/revocation, and existing public verification using
   test accounts. Run the repository's integration suite separately; it intentionally uses
   a disposable local database and must never delete staging data.
6. Back up staging, restore into a second empty `certverify_staging_restore` database and
   separate upload directory, and repeat counts/indexes, signature/file checks and the
   transaction probe. Record backup checksums, elapsed restore time and results without
   secrets or personal data. Rebuild staging containers and confirm file/database persistence.
7. Record evidence and exact tested commit below. Only then mark PR #2 ready for review.
   Complete controlled file access and operational readiness before subscriptions/credits;
   implement manual subscriptions before PayHere.

| Evidence | Result |
| --- | --- |
| Project, region/tier, staging host and tested commit | Database access verified; application staging host/region/tier review pending. Probe code: `5eb03d7c`. |
| Source backup and restored collection/index comparison | Passed: 12 collections, 111 documents; exact document hashes, options and indexes match in both Atlas copies. |
| Existing signature validation and upload inventory | 3 signed certificates verify; 11 unsigned legacy records. One signing-key record fails validation, 4 certificates have missing references, 26 file paths are absolute. All findings also exist in the source. |
| Atlas transaction commit/rollback and issuance retry tests | Commit/rollback passed on both copies. Application issuance/retry UAT remains pending. |
| Independent restore drill and rebuild persistence | Atlas backup restored into a second empty database and verified. All 35 upload files restored with matching hashes. Deployment rebuild persistence remains pending. |
| Separate secrets, restricted network, email sandbox | Pending |
| Monitoring destination, encrypted off-server backup and rotation | Pending |

Free Atlas clusters do not include managed backups; use a tested logical backup/restore
procedure or choose a tier with suitable backup support. See the official
[cluster setup](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/),
[migration options](https://www.mongodb.com/docs/atlas/import/) and
[free-cluster limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/).

## Backup custody and remaining blockers

Encrypted local recovery files and detailed manifests are in the Git-ignored directory
`Backend/backups/migration-20260930/`. Original and Atlas database archives, upload ZIP
and recovery configuration were encrypted with Windows DPAPI for the operator's Windows
account; decryption was verified. Plaintext working copies and temporary Atlas credential
caches were removed. This encryption depends on that Windows profile; an independently
recoverable encrypted off-server copy is still required. The source database and existing
Atlas sample data were not modified.

Recover or deliberately rotate the invalid institute signing key with an appropriate
credential continuity plan; resolve orphan references without inventing/deleting records;
normalize absolute file paths for the eventual staging host; isolate staging secrets and
email/SMS delivery; validate application issuance, private-file/share flows and persisted
deployment. Rotate the Atlas password disclosed in chat. No database URI/password is
recorded in this document, Git, or the validation output. These findings prevent marking
PR #2 ready despite successful data migration and restoration.
