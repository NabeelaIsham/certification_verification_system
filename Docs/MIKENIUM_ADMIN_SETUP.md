# Mikenium administrator setup

Requested account: `info@mikenium.com` / Mikenium Administrator.

The generated password is stored in the Git-ignored file
`.local-secrets/mikenium-superadmin.credential.xml`, encrypted with Windows DPAPI for the
Windows account that generated it. Directory access is restricted to that account and
SYSTEM. This file cannot be decrypted by a different Windows profile merely by copying it.
No password is included in source, logs or this document.

Account provisioning is pending the selected Atlas database and a current protected
connection. The existing backend configuration points to local `certverify`; it has not
been switched to Atlas. Generating the credential file does not create a database account.

After identifying the correct database and satisfying the backup/change gate, configure
`ATLAS_ADMIN_MONGODB_URI` and `ATLAS_ADMIN_DATABASE` securely in the operator's environment,
then run `Backend/scripts/setupAtlasSuperAdmin.ps1` using the same Windows profile. The
wrapper refuses local MongoDB and database-name mismatches. It passes the generated password
to the existing setup utility through the child process environment, not command arguments.

The User model hashes the password with bcrypt before storage. Updating an existing
super-admin resets its password and revokes earlier sessions by incrementing sessionVersion.
An existing account with the same email and a different role is not promoted by this script.
Existing two-factor authentication settings are preserved.

To retrieve the password in your own trusted PowerShell session, from the repository root:

```powershell
(Import-Clixml -LiteralPath '.local-secrets/mikenium-superadmin.credential.xml').GetNetworkCredential().Password
```

Do not paste the output into chat, issue descriptions or source files. Store it in your
password manager. Verify login against the selected Atlas environment after provisioning;
the provisioning result and database choice must be recorded separately from the password.
