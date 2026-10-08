# Certiverxia on Hostinger with Dokploy

Use this configuration for the selected Dokploy control panel. Do not also start
`deploy/hostinger/compose.yml`: that standalone configuration owns ports 80/443,
which are already used by Dokploy's Traefik.

## Create the application

1. In Dokploy, create a project and a **Docker Compose** service (not Docker Stack).
2. Connect the Git repository and reviewed release branch containing this directory.
   The current implementation is on `feat/manual-payment-receipts`; publish/merge
   reviewed changes before attempting to deploy them from Git.
3. Select repository root as the project directory and set Compose Path to
   `./docker-compose.dokploy.yml`. Preserve the repository folder layout.
4. In Environment, enter the real values listed in `.env.example` beside this file.
   Dokploy supplies these values to Compose; the Compose environment mapping passes
   only backend secrets into the backend. Frontend build arguments contain no secrets.
5. Use the actual Atlas production database name in the URI. The example name
   `certiverxia` is a proposal, not proof that a database exists. Preserve the existing
   signing-key encryption secret when importing certificates and signing keys.

## Domain settings

In this Compose service's **Domains** tab, add:

| Host | Service | Container port | Path | HTTPS |
| --- | --- | --- | --- | --- |
| certiverxia.com | frontend | 80 | / | Enabled, Let's Encrypt |
| www.certiverxia.com | frontend | 80 | / | Enabled, Let's Encrypt |

Enable HTTP-to-HTTPS redirection in Dokploy. The frontend redirects `www` to
`https://certiverxia.com`, preserving the path and query. Leave path stripping disabled.
Do not add a public backend domain or port mapping. Dokploy adds the domain labels;
the frontend joins `dokploy-network`, while the backend uses the project network.
See [Dokploy domain configuration](https://docs.dokploy.com/docs/core/docker-compose/domains)
and [Compose environment configuration](https://docs.dokploy.com/docs/core/docker-compose).

Set DNS `A @` to the actual Hostinger VPS IP, and `CNAME www` to `certiverxia.com`.
Verify the VPS address in hPanel; a successful domain ping alone does not identify
the correct VPS. Keep mail MX/SPF/DKIM/DMARC records. Allow HTTP/HTTPS ingress and
the VPS outbound IP in Atlas's network access list.

The path is browser → Dokploy Traefik (HTTPS) → frontend Nginx → backend.
`TRUST_PROXY=2` matches these two reverse proxies. The dedicated Nginx configuration
preserves the forwarded client chain and HTTPS protocol. Backend rate limits remain
enabled; Nginx does not apply a shared per-Traefik-IP limit.

## Email and manual payments

The Compose configuration sets sender `Certiverxia <info@certiverxia.com>`, SMTP
host `smtp.hostinger.com`, and TLS port 465. Set the mailbox password as `EMAIL_PASS`
in Dokploy. If the restored database has old saved SMTP settings, run
`node scripts/setupEmailSettings.js` inside the configured backend container after
selecting and backing up the correct database. Saved SMTP settings take precedence
over environment values. This setup command does not send a message.

Keep outbound delivery disabled during initial validation. Set
`OUTBOUND_DELIVERY_MODE=live` and redeploy only when production data and recipients
have been validated. In Super Admin → Subscriptions, enter the bank details.
Packages use manual receipt upload and admin approval; no PayHere is enabled.

## Persistence and release checks

### Recover a backend restarting with uploads EACCES

If logs show Atlas connected followed by `EACCES` on `/usr/src/app/uploads`,
publish the updated `Backend/Dockerfile` and `docker-compose.dokploy.yml` to the
branch selected in Dokploy, then rebuild and redeploy the Compose application.
A restart alone does not apply image or Compose changes.

The backend runs as UID/GID 1000 (the Node image's `node` user). The
`storage-init` service first repairs ownership of the existing uploads and backups
volumes, preserving their contents. It has no network access or application secrets
and exits after its task. An `Exited (0)` status for this service is expected;
the backend waits for its successful completion before running preflight.
The backend retains its read-only root filesystem and drops all capabilities.
Do not delete volumes or disable production preflight to resolve this error.

Check that backend logs now show `Uploads directory: writable` and
`Production preflight: PASSED`, and that the backend stays healthy. Then check
`https://certiverxia.com/health` and retry login. If another preflight error appears,
resolve that specific error before treating the deployment as ready.

Keep this Dokploy service/project identity stable: Compose volumes hold uploads and
backup output across redeployments. Changing project identity can create empty volumes.
Atlas holds the database, including receipt images. Volumes are not off-server backups.
Restore uploads along with migrated database records and validate signing keys before release.

Backend startup runs the existing production preflight, which must pass. Resolve reported
data/signing-key failures instead of bypassing the gate. Check container health, then
`https://certiverxia.com/health`, login, issuance, private files, subscription payment
review, and email delivery. Verify HTTPS redirects and volume persistence after a redeploy.
The real admin account must exist in the selected Atlas database; local admin changes
are not automatically migrated. No administrator password is bundled in this config.

Known status: staging Atlas migration/restore was recorded previously. Production Atlas
provisioning, live Dokploy deployment, DNS/TLS and production acceptance are not confirmed.
The configuration has local structural checks only; Docker is unavailable locally.
