# Certiverxia production database initialization

Update on 2026-10-08: created the production super admin `info@certiverxia.com`
using `Backend/scripts/setupSuperAdmin.js` in create-only mode. Verified role,
active/approved status, and bcrypt password comparison against the generated credential.
Its password is stored locally in the Git-ignored Windows-account-encrypted file
`.local-secrets/certiverxia-production-admin.credential.xml`. No plaintext password
or hash is recorded here. Plans, bank settings and deployment acceptance remain pending.

On 2026-10-08, initialized `certiverxia` on
`certificatecluster.rg7yd9u.mongodb.net` using the user-provided protected connection.
The database had no collections before initialization. No source data was imported.

Created 21 application collections and their declared indexes using the models from
the manual-payment implementation, including bank details, subscriptions and receipts.
Transaction commit and rollback probes passed; the uniquely named probe collection
was removed afterward. No staging database was modified.

Collections: bankpaymentdetails, plans, subscriptions, usagetransactions,
subscriptionevents, payments, users, notifications, courses, students,
certificatetemplates, certificates, settings, otps, loginchallenges, activitylogs,
verificationlogs, credentialshares, certificateissuances, issuancelocks, issuanceevents.

The ignored local `Backend/.env` stores `ATLAS_PRODUCTION_MONGODB_URI` with the
explicit `/certiverxia` database path. No credentials are recorded in this document.
For Dokploy, securely copy that value into `MONGODB_URI`. The local development
`MONGODB_URI` was not changed.

This is an empty initialized database, not a completed migration or production release.
There are no production users/admin credentials, plan records, bank details, receipts
or certificates yet. Provision the production admin and configuration, or perform an
approved backed-up migration and upload restoration. Validate preflight, issuance,
private files, manual payment approval, email and backups before onboarding customers.
