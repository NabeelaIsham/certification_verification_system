# Priority 4 and 5 deployment gates

The Atlas migration and independent restore passed. This does not constitute application
staging acceptance or production readiness. PR #2 remains draft and Priority 6 stays deferred.

## Deployment configuration

Use `docker-compose.atlas.yml` as a standalone Compose file. The original Compose file
starts a legacy standalone MongoDB instance and must not be combined with the Atlas file.
Set these Compose inputs through the deployment service's environment:

- `DEPLOYMENT_NAME`: distinct stable project names for staging and production.
- `DEPLOYMENT_ENV`: `staging` or `production`.
- `BACKEND_ENV_FILE`: protected backend environment file outside source control.
- `FRONTEND_PORT`: loopback port used by the host's HTTPS reverse proxy (default 3000).

The backend secret file must contain the production settings required by
`Backend/config/production.js`, including an explicit Atlas database name in `MONGODB_URI`.
Staging requires `certverify_staging` or a `certverify_staging_...` database name. Production
rejects those names. Use separate database users restricted to each environment.
Preserve the credential encryption key needed by existing signing keys until a verified
reencryption migration is complete; changing it blindly makes issuance fail.

Set `OUTBOUND_DELIVERY_MODE=disabled` for initial staging. For delivery tests, use `allowlist`
and explicit comma-separated `STAGING_EMAIL_ALLOWLIST` / `STAGING_SMS_ALLOWLIST` recipients.
SMS entries must exactly match the input phone strings. Staging rejects `live` even if the
restored database contains production SMTP settings. Use sandbox provider accounts as well.

Run `docker compose -f docker-compose.atlas.yml config --quiet` to validate configuration
without printing resolved secrets. After restoring uploads to the environment's named
volume and resolving the gates below, run `docker compose -f docker-compose.atlas.yml up -d --build`.
The backend runs production preflight before starting. Preflight checks transaction topology,
signing keys, references and portable file paths; it does not repair records or create indexes.
The application's normal startup still creates its required collections and indexes.

Each project retains its uploads and backups in separate named volumes. Never use
`down --volumes` on an environment whose data must be retained. Configure HTTPS and check
proxy trust against the actual host topology before exposing the application. See Docker's
[project isolation](https://docs.docker.com/compose/how-tos/project-name/) and
[volume documentation](https://docs.docker.com/reference/compose-file/volumes/).

## Outstanding acceptance evidence

| Gate | Current state / required action |
| --- | --- |
| Signing key | One invalid record; the current JWT fallback also cannot validate it. Recover the original encryption key or approve an explicit signing-key continuity migration. |
| References | Four certificates have missing related records. Identify authoritative records; do not invent replacements or delete history. |
| Portable uploads | 26 absolute references need a reviewed mapping to relative tenant paths and matching restored files. |
| Legacy certificates | 11 unsigned records need an agreed legacy policy; the three signed records verify. |
| Hosting | Choose staging/production host and install environment-specific secrets, network rules and HTTPS. |
| Application validation | Exercise issuance retries, file access, shares/revocation and public verification on Atlas staging. |
| Persistence | Recreate application containers and verify the same database records and upload hashes remain. |
| Backups | Existing local DPAPI backups were restored successfully, but need independently recoverable encryption, an off-server destination, scheduled jobs, retention and alerts. The existing `backup:database` utility creates plaintext dumps and is not a complete production backup system. |
| Monitoring | Configure health/readiness checks, backup-age and failure alerts, storage usage and delivery errors with an owner and alert destination. |
| Secrets/history | Rotate exposed provider/database credentials; preserve signing-key decryptability. Coordinate Git history cleanup across published branches and clones. |

Detailed completed migration evidence is in [ATLAS_STAGING.md](ATLAS_STAGING.md).

### File-path migration

From `Backend`, run `node scripts/normalizeStagingFilePaths.js --dry-run`. It reads the
explicitly selected database and checks that each replacement file exists within its
restored tenant directory, rejecting linked, missing and unsafe files. No records change.
For an Atlas staging run, supply `STAGING_MONGODB_URI` through the secret environment;
otherwise a dry run uses `MONGODB_URI`. Output contains counts, not paths or credentials.

After a fresh backup, reviewing the dry run and restoring the correct upload snapshot,
use `node scripts/normalizeStagingFilePaths.js --apply`. Apply requires a dedicated
`STAGING_MONGODB_URI`; it has no production fallback. All changes commit in one transaction
with original-value guards; missing files or concurrently changed records prevent a partial
migration. Re-run the dry run and production preflight afterward. This repairs path strings
only; signing keys and missing related records remain separate blockers.

Only after these gates pass should PR #2 become ready, the stacked changes be reviewed and
deployed, and manual subscriptions/credit enforcement begin. PayHere follows validated
manual subscriptions.
