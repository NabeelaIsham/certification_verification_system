# Authentication and account security fixes

These fixes extend the [October 16 remediation](REMEDIATION_PROGRESS_2026-10-16.md).
They are local workspace changes on top of main `f5dd55b6`, not evidence of a completed
production deployment. This review focused on authentication, tenant access and secret
disclosure; it is not an assurance that every possible security issue has been eliminated.

## Reproduced problems and corrections

| Problem | Correction and evidence |
| --- | --- |
| An active teacher could retain access when their institute was suspended, unapproved or missing. Some mutation services checked the parent, but authentication and read routes did not. | A shared database-backed institute check now runs in authentication, both password-login endpoints and two-factor completion. Integration tests first reproduced HTTP 200 access for each unavailable-parent case and now require HTTP 403 without a token or session cookie. |
| A pending two-factor challenge survived a password/session-version change and could create a new session using the new version. | Challenges store the version from the password step. Completion rejects a mismatch or a missing legacy version, and requires a fresh sign-in. A real password-change flow reproduced the old acceptance and now rejects the outstanding code with HTTP 401. Enrollment checks precede any settings change, and its atomic update also requires the same session version and an active account. |
| Administrative status responses returned user documents containing password hashes. The model's safe-object method was not automatically applied by JSON serialization. | User JSON serialization now removes passwords, password-setup material and encrypted signing keys. Tests cover the model and the actual administrator status route, while confirming internal signing/password material is not erased. |
| Deactivating and later reactivating an individual account allowed its old sessions to become usable again. | Administrator account-status changes and institute-controlled teacher activity updates increment that account's session version. Tests reject the old token after reactivation and accept a fresh password login. Teacher activity updates also require actual booleans. |
| The teacher login route accepted malformed email/password types until they failed internally, and the common login accepted arbitrary account-type query values. | Both reject malformed fields before querying/authenticating. JWT creation and verification explicitly use HS256, matching the application's existing signing algorithm. |

The institute check affects authenticated institute/teacher access, not the public
verification history of previously issued certificates. It does not replace subscription
entitlement checks or alter certificate signing identities. Account suspension and package
suspension remain distinct operations.

## Validation

- Before applying the fixes, six new integration cases and the user-serialization case
  failed on the original behavior.
- Backend lint and the final **184 unit tests** in 24 suites passed. The full integration
  run passed **135 tests** in four suites. After the enrollment guard refinement, the
  focused authentication integration suite passed all **21 tests**, including two additional
  invalidated-enrollment cases; the unit suite was also rerun successfully.
- Integration tests used disposable local MongoDB replica sets with mocked outbound email.
  The suite also retained coverage of issuance retries, tenant isolation, subscriptions,
  private files, controlled sharing and revocation.
- No real email/SMS was sent and no production database, account, key, deployment setting
  or remote Git ref was changed.

## Rollout and remaining work

Review and publish these changes, require CI on that exact commit, and deploy the backend.
People with a two-factor challenge created before the rollout must sign in again for a new
code; unversioned challenges deliberately cannot finish authentication. The database does
not need replacement signing keys or certificate changes for this rollout.

Local fixes do not resolve the outstanding www TLS deployment, GitHub protection/open-PR
cleanup, provider credential rotation, reachable historical secrets, historical certificate
recovery decisions, Atlas restrictions, off-server backups/restore, persistent-storage or
monitoring acceptance. Those require the relevant account access and operational evidence.
See [production readiness](production-readiness.md) for the remaining actions.
