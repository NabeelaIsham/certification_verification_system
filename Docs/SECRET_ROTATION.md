# Credential rotation and history cleanup

Historical `Backend/.env` entries were confirmed by filename-only Git history inspection.
No credential values are recorded here. `.gitignore` prevents the current file from being tracked.

Record completion dates and responsible operators here, never secret values:

| Credential | Rotation verified | Deployment verified |
| --- | --- | --- |
| SMTP/email password (including database-saved SMTP settings) | Pending | Pending |
| JWT secret | Pending | Pending |
| MongoDB application/admin credentials | Pending | Pending |
| SMS/API credentials | Pending | Pending |

Revoke old provider credentials, update each environment's secret store, restart affected
services, and test email, login, database access and API delivery. JWT rotation signs users out.
The credential encryption key protects existing institute signing keys: replacing it blindly
breaks signing. If it was exposed, plan key re-encryption and issuer-key rotation separately.

Coordinate a push freeze, preserve authorized unmerged work, and perform cleanup in a fresh
dedicated clone. A reviewed cleanup command is:

```powershell
git filter-repo --sensitive-data-removal --invert-paths --path Backend/.env
git log --all -- Backend/.env
```

Inspect renamed paths, scan the cleaned history with redaction enabled, and test a fresh clone.
Review affected refs before a coordinated force-push. Restore branch protections afterward.
Collaborators must replace or clean old clones to avoid reintroducing the history. Forks and
cached pull-request references may need separate cleanup.

Follow [GitHub's sensitive-data removal procedure](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
Rotation and a history rewrite have not been performed by this repair branch.
