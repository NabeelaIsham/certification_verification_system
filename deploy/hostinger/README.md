# Certiverxia on a Hostinger VPS

Production URL: **https://certiverxia.com**. Contact/sender: **info@certiverxia.com**.
This directory prepares deployment; it does not change DNS, provision Atlas, or deploy the server.

## Layout

Copy the complete repository to `/opt/certiverxia`, retaining these relative paths:

```text
/opt/certiverxia/
  Backend/
  Frontend/
  deploy/hostinger/
    compose.yml
    nginx.conf
    backend.env.example
    traefik/routes.yml
    secrets/backend.env       # create on VPS only; ignored by Git
```

Docker persists uploads, backup output, and TLS certificates in named volumes
`certiverxia_uploads`, `certiverxia_backups`, and `certiverxia_letsencrypt`.
Atlas holds application data. There is no standalone MongoDB container: issuance needs transactions.

## DNS and server

Use an Ubuntu VPS with Docker Engine and the Compose plugin installed using
[Docker's official Ubuntu instructions](https://docs.docker.com/engine/install/ubuntu/).
If Hostinger already runs Traefik for other applications, integrate these routes with that
instance instead of starting a second proxy on ports 80/443.

In your domain DNS, set `A @` to the VPS public IPv4 address shown in Hostinger hPanel.
Set `CNAME www` to `certiverxia.com`. Your screenshot resolves the domain to
`201.18.217.142`; use that address only if it is also your VPS address in hPanel.
Remove conflicting A/AAAA records, or configure IPv6 correctly. Keep Hostinger mail
MX, SPF, DKIM and DMARC records intact.

Allow inbound TCP 80/443 and restrict SSH to your administrator IP where possible.
Only Traefik publishes application ports. Backend 5000 is private to Docker.
Allow outbound DNS, HTTPS, Atlas connections and Hostinger SMTP 465. Add the VPS
outbound IP to the Atlas network access list.

## Configuration and existing data

From the repository root on the VPS:

```sh
cd /opt/certiverxia
umask 077
mkdir -p deploy/hostinger/secrets
cp -n deploy/hostinger/backend.env.example deploy/hostinger/secrets/backend.env
chmod 700 deploy/hostinger/secrets
chmod 600 deploy/hostinger/secrets/backend.env
nano deploy/hostinger/secrets/backend.env
```

Use the actual Atlas URI with an explicit database name. `certiverxia` in the example
is a placeholder database choice, not a command to rename or create your existing database.
Use the existing credential encryption and privacy secrets when migrating existing data;
changing the encryption secret prevents existing signing keys from being decrypted.
Use distinct strong secrets and copy the Hostinger mailbox password through a secure channel.
Do not upload the development `.env`, Windows credential XML, backups, or `node_modules`.

Restore and validate the selected database and uploads before startup. The local admin
rename and local email configuration are not automatically present in Atlas.
For a new empty database, provision the requested administrator deliberately using the
existing setup tool before opening registration. Leave bootstrap variables blank afterward.
For an existing database, confirm `info@certiverxia.com` exists with the intended role.

To synchronize saved SMTP settings with this environment after the database is selected:

```sh
docker compose -f deploy/hostinger/compose.yml build
docker compose -f deploy/hostinger/compose.yml run --rm backend node scripts/setupEmailSettings.js
```

This command updates the selected database's email settings. It does not send email.
The environment starts with outbound delivery disabled; set `OUTBOUND_DELIVERY_MODE=live`
only after validating the production data, SMTP configuration, and intended recipients.
Secrets never belong in frontend `VITE_*` variables.

## Validate and start

```sh
docker compose -f deploy/hostinger/compose.yml config --quiet
docker compose -f deploy/hostinger/compose.yml run --rm backend node scripts/productionPreflight.js
docker compose -f deploy/hostinger/compose.yml up -d --build
docker compose -f deploy/hostinger/compose.yml ps
docker compose -f deploy/hostinger/compose.yml logs --tail=100 backend traefik
curl --fail https://certiverxia.com/health
curl -I http://certiverxia.com
curl -I https://www.certiverxia.com
```

Preflight intentionally blocks startup for missing secrets, unsupported MongoDB topology,
invalid signing keys or unresolved deployment data issues. Resolve those failures; do not
remove the preflight command. Test login, `/pricing`, subscription requests, controlled file
access, issuance and verification before accepting real institutes.

Traefik routes `/api`, `/uploads` and `/health` directly to the backend; the backend trusts
one proxy. The frontend serves the SPA only. Traefik obtains and renews Let's Encrypt
certificates using HTTP-01 on port 80. `www` redirects to the apex domain with the path intact.
File-provider routing does not mount the Docker socket. Access logs at the proxy are off to
avoid recording bearer links. See [Traefik file routing](https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/file/).

## Updates, backups and rollback

Before upgrades, record the deployed Git commit and take a fresh database backup plus an
uploads snapshot. Store encrypted copies off the VPS and test restoration into a separate
database. Named volumes provide persistence, not independent backups. The backend image
does not contain `mongodump`; use Atlas backups or MongoDB Database Tools on the operator
host. Windows DPAPI-encrypted historical backups must be decrypted on their original Windows
account before secure transfer and Linux restoration.

Deploy a reviewed commit with the build/preflight/start commands above. Reverting application
code does not reverse database migrations; use a compatible previous release and a tested
restore plan. Never run `docker compose down -v` against this deployment: it deletes uploads
and TLS state. Monitor `/health`, container restarts, disk capacity and certificate renewal.

New certificate links use `https://certiverxia.com` from the production environment.
Previously issued PDFs, QR images and signed credentials are not rewritten by configuration.
Keep any old domain redirects where you own that domain; do not mutate signed payloads.
Legacy `VerifyAwardsCredential` schema/URN identifiers remain for signature compatibility.

## Validation status

The configuration can be parsed locally, but Docker is unavailable in the development
workspace. Image builds, Nginx configuration validation, real routing, TLS issuance and
Atlas preflight must be completed on the VPS before this is considered deployed.
