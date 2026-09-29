# Atlas staging acceptance gate

Status: NOT PROVISIONED or validated by this repair. The Atlas project, region/tier,
authenticated account access and a staging connection secret are still required.
PR #1 is merged; PR #2 targets main and must remain draft until the checks below pass.

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
| Project, region/tier, staging host and tested commit | Pending |
| Source backup and restored collection/index comparison | Pending |
| Existing signature validation and upload inventory | Pending |
| Atlas transaction commit/rollback and issuance retry tests | Pending |
| Independent restore drill and rebuild persistence | Pending |
| Separate secrets, restricted network, email sandbox | Pending |
| Monitoring destination, encrypted off-server backup and rotation | Pending |

Free Atlas clusters do not include managed backups; use a tested logical backup/restore
procedure or choose a tier with suitable backup support. See the official
[cluster setup](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/),
[migration options](https://www.mongodb.com/docs/atlas/import/) and
[free-cluster limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/).
