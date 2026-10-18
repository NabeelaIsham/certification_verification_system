# Mikenium administrator setup

This optional operator helper targets `info@mikenium.com` / Mikenium Administrator.
Its presence does not prove that the account exists, that an earlier password remains
valid, or that any particular Atlas database has been provisioned.

Use a trusted Windows-protected `PSCredential` export for that account. Prefer keeping
it outside the repository and pass its path explicitly using `-CredentialFile`.
Credential exports, passwords and connection strings must not be committed. The
`.local-secrets` directory is ignored for compatibility with older local setups; it
is not a substitute for protected credential storage or credential rotation.

Confirm the intended Atlas database and the recovery plan before running the helper.
Configure `ATLAS_ADMIN_MONGODB_URI` and `ATLAS_ADMIN_DATABASE` through a protected operator
environment. The wrapper requires an Atlas SRV host and an explicit application database
matching `ATLAS_ADMIN_DATABASE`; it rejects local MongoDB and reserved database names.

```powershell
./Backend/scripts/setupAtlasSuperAdmin.ps1 -CredentialFile 'C:\private\mikenium-superadmin.credential.xml'
```

The wrapper supplies credentials to `setupSuperAdmin.js` through the child process
environment and restores the original environment afterward. Use the Windows profile
that created the protected export. Do not print passwords in shared terminals or logs.

The setup utility creates a missing super admin or resets the password of an existing
super admin with the same email, reactivating the account and revoking earlier sessions.
Set `SUPERADMIN_CREATE_ONLY=true` to reject an existing account instead of resetting it.
An account with the same email and a different role is not promoted. Existing two-factor
authentication settings are preserved. Record the selected environment and provisioning
result separately from credentials, and verify login only against that intended environment.
