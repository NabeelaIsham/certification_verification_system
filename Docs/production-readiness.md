# Production verification and remaining account actions

Updated 2026-10-13. Local code checks are not proof of a completed production rollout.

## Evidence collected

| Item | Result |
| --- | --- |
| `https://certiverxia.com/health` | HTTP 200; database `connected`, health `healthy` |
| `http://certiverxia.com/` | Redirects to HTTPS; final response 200 |
| `https://www.certiverxia.com/` | TLS validation failed: self-signed certificate |
| Backend unit tests | 21 suites / 139 tests passed |
| Backend replica-set integration tests | 4 suites / 113 tests passed, including tenant, subscription and cookie-session behavior |
| Frontend tests | 21 files / 58 tests passed |
| Git history | An isolated cleaned mirror was prepared; public history was not changed |
| Branch protection | Could not apply: no existing GitHub administrative credential was available |

No production database records, server settings, credentials, or remote Git refs were changed during these checks. Docker is unavailable in this workspace; the modified production image still needs its hosted CI build.

The local storage probe write/verify check passed; no container was recreated. Running the readiness command without production configuration correctly exited nonzero before connecting to a database. Both package lints, the SaaS-enabled frontend build, and full/production-only npm audits passed (zero reported vulnerabilities). The build retains its existing large-JavaScript-chunk warning.

The public URL checks were repeated on October 13: apex HTTPS and database health still pass, while www still presents a self-signed certificate. A frontend worker initially timed out before executing tests; the complete suite subsequently passed outside the sandbox. Browser authentication is additionally covered through real application routes and a disposable replica-set database, including both login endpoints, 2FA, CSRF rejection and logout.

## Coordinated application rollout

Deploy the frontend and backend together. Browser login now uses an HttpOnly cookie, with Secure enabled in production, SameSite=Lax and path `/api`. Legacy browser tokens are removed; existing users must sign in again. Explicit nonbrowser API clients retain bearer support. State-changing browser calls require the shared client's `X-Client-Type` header and an exact trusted Origin. Session startup is verified by `/api/auth/me`.

Use the same public site for frontend and API (normally `/api` behind the existing proxy). Cross-site frontend/API installations are not supported by the Lax cookie configuration. Configure exact HTTPS origins in `CORS_ALLOWED_ORIGINS`; wildcard origins are rejected. Confirm login, reload, logout, 2FA, private images and certificate downloads in the deployed browser after rollout.

## Run inside the backend container

Configure Dokploy's environment using `Backend/.env.example` and the production validator. Required values include `MONGODB_URI`, separate `JWT_SECRET`, `CREDENTIAL_KEY_ENCRYPTION_SECRET`, `VERIFICATION_PRIVACY_SECRET`, `API_URL`, `FRONTEND_URL`, `TRUST_PROXY`, `DEPLOYMENT_ENV=production`, explicit trusted origins, and delivery/provider settings. Do not put secrets into build arguments, Git, or command history.

```sh
npm run preflight:production
npm run check:deployment
```

The second command checks production constraints, transaction-capable MongoDB topology, public HTTPS routing, writable uploads and disk headroom, recent logical backups, SMTP authentication and explicit live delivery mode. It logs no credential values and sends no emails. SMTP verification does not establish inbox delivery, and a recent archive does not establish that a schedule or restore works. Failures exit nonzero. Atlas-managed snapshot evidence must be checked separately.

In Dokploy, fix `www.certiverxia.com`: verify DNS targets the VPS, configure its HTTPS domain/router, and issue a trusted certificate covering that hostname. Test TLS before redirecting it to the apex domain; an HTTPS redirect cannot fix an invalid certificate presented before the redirect.

## Storage, backups and restoration

Mount persistent storage at `/usr/src/app/uploads` and `/usr/src/app/backups` (or the configured `BACKUP_DIRECTORY`), writable by the container's `node` user. To prove uploads survive recreation:

```sh
node scripts/storageProbe.js write
# Recreate the backend container through Dokploy without deleting volumes.
node scripts/storageProbe.js verify <the-returned-probe-id>
```

The probe refuses to replace an existing marker and removes only its matching marker after verification. Record the recreation and verification results together.

The Dockerfile now includes MongoDB Database Tools. Configure a daily Dokploy job running `npm run backup:database` in the backend service. Check the scheduler timezone, successful executions, and backup timestamps across at least two scheduled runs. The command creates a compressed archive and SHA-256 manifest, publishes the completed archive atomically and keeps the database URI out of process arguments. Replicate both files to encrypted off-host storage with access restrictions and a retention policy. Add a separate backup policy for uploads; a MongoDB dump does not contain uploaded files. Do not rely solely on a VPS-local volume.

Enable scheduled Atlas backups where supported by the cluster tier and record retention and restore-point evidence. For the logical restore drill, inject `RESTORE_MONGODB_URI` and `BACKUP_SOURCE_DATABASE` securely into an isolated environment. The target must be a new, empty database named `certverify_restore_check_<unique-name>` and must not equal the source database.

```sh
npm run backup:restore-drill -- /path/to/certverify-<timestamp>.archive.gz
```

The drill verifies the checksum, refuses an occupied target, restores only the selected source namespace, and reports collection counts. It does not delete the restored database. Compare counts against backup-time evidence and run read/application checks on the isolated restored deployment before recording a successful recovery. Do not point the automated integration suite at production: it manages its own disposable database.

## Account actions still required

- **Atlas access:** restrict the network access list to the VPS egress address and any explicitly authorized administration/backup source. Remove broad access only after confirming the allowed production connection works. Use a least-privileged application database user.
- **Email:** SMTP authentication plus an explicitly authorized test recipient is needed to establish inbox delivery and SPF/DKIM/DMARC behavior. No test email was sent in this session.
- **Monitoring:** configure external HTTPS/health monitoring, certificate-expiry alerts, database alerts, backup-age/failure alerts, and VPS disk/inode alerts (the readiness check defaults to a 15% free-space floor). Prove alert delivery through the configured alert channel. A script on an unmonitored server is not external monitoring.
- **Deployed isolation and credits:** use designated test institutes and users. Verify cross-institute API/file access is rejected; test credit debit, insufficient balance, duplicate issuance/payment attempts, and concurrent requests. Record before/after balances and clean up only identified test records. Local integration tests passed, but this has not been executed against deployed Atlas.
- **Credential rotation:** historical environment files contained database, SMTP, JWT, superadmin, TextLK and Twilio credential variables. Rotate/revoke the corresponding real credentials at their providers and update Dokploy securely; verify the old credentials no longer work. Reset affected privileged passwords and invalidate old sessions. Do not simply replace an encryption key used for stored signing material: preserve/re-encrypt that material through a planned migration if that key is affected.

The TextLK token included in the IDE context on October 13 also needs provider-side revocation/replacement. Its value is intentionally absent from this report. Application logs now serialize safe error fields with credential redaction, and SMS failures no longer attach raw provider responses. These changes prevent those logging paths from copying secrets; they do not revoke a previously exposed token.

## GitHub protection and historical secrets

`Scripts/protect-main.py` prepares the requested policy: PRs, at least one approval, stale approval dismissal, all 11 CI checks, up-to-date branches, administrator enforcement, no force pushes and no branch deletion. It preserves existing required contexts and refuses to overwrite custom restrictions without review. Authenticate locally with repository administration permission; never paste a token into chat.

```sh
python Scripts/protect-main.py
python Scripts/protect-main.py --apply
```

Ensure these CI contexts have run successfully on GitHub, then verify the resulting protection in repository settings. The script could not apply the policy in this session because administrative credentials were unavailable.

An ignored mirror at `.history-cleanup/repository.git` was rewritten with `git-filter-repo` to remove `Backend/.env`, `Frontend/.env` and root `.env` from every reachable ref. Its reachable history check and `git fsck` passed; cleaned main was `9084818e34035db486c1cc03d493c07b872ab62f`. This is an intermediate artifact: it predates the current uncommitted fixes. After committing the fixes, regenerate the cleaned mirror before any coordinated publication so those fixes are retained.

Public history, forks, pull-request caches and collaborators' clones have not been cleaned. Rotate credentials first, inventory affected refs, coordinate rewritten-history publication and fresh clones, and address cached copies with GitHub as needed. Do not blindly push this intermediate mirror or use `push --mirror`. Re-enable/verify the no-force-push protection after any explicitly coordinated history replacement. Removing a file from history does not revoke a credential or prove no other file contains a secret.
