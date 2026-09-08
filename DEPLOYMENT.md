# Deployment Guide

## Required Services

- Node.js 20 or newer
- MongoDB connection string
- A domain or subdomain for the frontend
- A domain, subdomain, or reverse proxy path for the backend API

## Backend Environment

Copy the repository `.env.example` to `Backend/.env` and set production values:

```bash
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://your-mongo-host:27017/certverify
JWT_SECRET=use-a-long-random-secret
CREDENTIAL_KEY_ENCRYPTION_SECRET=use-a-different-long-random-secret
VERIFICATION_PRIVACY_SECRET=use-another-long-random-secret
API_URL=https://api.your-domain.com
FRONTEND_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
TRUST_PROXY=1
VERIFICATION_LOG_RETENTION_DAYS=180
SHARE_RECORD_RETENTION_DAYS=30
SUPERADMIN_EMAIL=admin@your-domain.com
SUPERADMIN_PASSWORD=change-this-secure-password
SUPERADMIN_NAME=System Administrator
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-app-password
```

Keep `CREDENTIAL_KEY_ENCRYPTION_SECRET` stable and backed up securely. Changing or losing it
prevents existing institute private keys from being used. Production startup fails when required
values are missing, secrets are short or reused, URLs are not HTTPS, CORS uses a wildcard, or
proxy trust is unspecified.

`TRUST_PROXY=1` is correct only when exactly one trusted reverse proxy is between the client and
the API. The backend port must not be publicly reachable in that configuration.

## Account Two-Factor Authentication

Institute admins can enable email 2FA under Settings → Security. Teachers can enable it under Profile → Security. Each account must enter its current password and verify an emailed code before 2FA becomes active. Disabling requires the current password from an authenticated session.

Configure and test SMTP delivery before enabling 2FA. Login and setup codes use the verification expiry, attempt limit, and resend settings maintained by the super admin. Deploy the backend and frontend together; existing accounts default to 2FA disabled until they opt in. The separate super admin 2FA policy remains under system security settings.

## Frontend Environment Configuration

Create `Frontend/.env` from `Frontend/.env.example`:

```bash
VITE_API_BASE_URL=https://api.your-domain.com/api
```

## cPanel / Namecheap VPS Deployment

1. Upload the project to the VPS.
2. In `Backend`, run:

```bash
npm ci --omit=dev
npm run preflight:production
npm run setup-superadmin
npm start
```

3. In `Frontend`, build the static site:

```bash
npm ci
npm run build
```

4. Upload/copy the contents of `Frontend/dist` to the cPanel public document root for your frontend domain.
5. Configure cPanel Node.js App, PM2, or a reverse proxy to run `Backend/server.js`.
6. Ensure the backend API is reachable at `https://api.your-domain.com/api`.
7. Ensure `Backend/uploads` is persistent and writable by the Node.js process.

## PM2 Option

From `Backend`:

```bash
pm2 start ecosystem.config.js
pm2 save
```

## Docker Option

If Docker is available on the VPS:

```bash
docker compose up -d --build
```

The Compose setup uses MongoDB 4.4 because MongoDB 5+ images can crash with
`Illegal instruction` / exit code `132` on older VPS CPUs that do not expose AVX.

For an existing checkout on the VPS:

```bash
git pull
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 mongo
```

If this is a fresh install and the Mongo container still fails because the old
failed container left an incompatible empty database volume, reset only the Mongo
volume and start again:

```bash
docker compose down
docker volume rm certification_verification_system_mongo-data
docker compose up -d --build
```

Do not remove the Mongo volume on a server that already contains real production
data unless you have a verified backup.

Before production use, replace the example secrets in `docker-compose.yml` or move them to a secure environment file.

## Required Pre-deployment Procedure

Do not replace the live containers before completing these steps.

1. Back up MongoDB. On a Linux Docker host:

```bash
mkdir -p backups
docker compose exec -T mongo mongodump --archive --gzip > "backups/certverify-$(date +%Y%m%d-%H%M%S).archive.gz"
test -s backups/certverify-*.archive.gz
```

For a host installation with MongoDB Database Tools:

```bash
cd Backend
npm run backup:database
```

2. Copy the production database and configuration to staging.
3. Build without replacing the running containers:

```bash
docker compose build
```

4. Run the production preflight. It checks the environment, MongoDB, upload permissions, and all
   existing encrypted institute signing keys:

```bash
docker compose run --rm backend node scripts/productionPreflight.js
```

5. In staging, test institute, teacher and bulk issuance; online/offline QR verification;
   lifecycle actions; share limits; email links; security analytics; and a printed QR code.
6. Deploy and inspect health:

```bash
docker compose up -d
docker compose ps
curl --fail https://your-domain.com/health
docker compose logs --since=10m backend frontend
```

The health endpoint returns HTTP 503 while MongoDB is disconnected.

## Signing-key Operations

- Routine rotation keeps the retired public key trusted, so existing credentials remain valid.
- Compromise rotation marks the old key compromised; credentials signed by it no longer pass
  registered-issuer trust.
- Rotation requires typing `ROTATE` in the institute Security screen.
- Never delete previous public-key metadata.
- Never change `CREDENTIAL_KEY_ENCRYPTION_SECRET` during an ordinary deployment.

Printed certificate QR codes use short frontend verification URLs so they remain scannable at
normal certificate sizes. The backend validates the stored credential signature, registered
issuer key, and lifecycle status after a scan. Share tokens must reach the API, so the supplied
Nginx and application logging configurations suppress or redact those request paths.

## Rollback

The database additions are backward-compatible. To roll back application code:

1. Keep MongoDB and `CREDENTIAL_KEY_ENCRYPTION_SECRET` unchanged.
2. Redeploy the previous known-good images or commit.
3. Confirm `/health`, login and legacy verification.
4. Restore MongoDB only if corruption is confirmed; restoring an older backup discards newer
   certificates and lifecycle events.
