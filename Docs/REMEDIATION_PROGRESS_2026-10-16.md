# Remediation after the October 16 review

This work follows the [readiness review](READINESS_REVIEW_2026-10-16.md) of main
`f5dd55b64864352fcb3710d22b1c8c0adb0e0d05`. Changes below are local until committed,
reviewed, checked in hosted CI and deployed. No remote settings or original certificate
records have been changed by this remediation.

The subsequent [authentication security review](SECURITY_FIXES_2026-10-16.md) reproduced
and fixed teacher access under unavailable institutes, stale two-factor challenges,
user-JSON secret disclosure and individual-account session revival after reactivation.
Its final backend validation passed 184 unit tests, the full integration run passed 135 tests,
and the subsequent focused authentication run passed 21 tests after enrollment refinement. The earlier
validation table below records the preceding deployment/UI remediation stage.

## Local fixes prepared

- Replaced the simulated student dashboard with a real certificate lookup. `/student`
  accepts a certificate code, `/verify/:code` URL or `/certificate/:code` share URL and
  opens verification. The old `/student/dashboard` route redirects to this lookup.
- Verification parsing accepts the current domain's certificate-sharing URLs. Existing
  public certificate pages, social metadata and protected private-file routes are retained.
- Route components load on demand, retaining the login/role guards and an accessible
  loading state. The initial JavaScript bundle falls from 1,048.79 kB to 344.04 kB
  (296.75 kB to 111.78 kB gzip); the largest output chunk is 364.82 kB. The build no
  longer reports the large-chunk warning.
- Dokploy Compose now declares www HTTP/HTTPS routers, with Let's Encrypt TLS and the
  existing Nginx canonical redirect. The apex remains Dokploy-managed. Deployment still
  needs matching DNS, standard Traefik entrypoint/resolver names, and removal of any
  duplicate www Domain entry after inspecting Preview Compose.
- Deployment readiness checks the canonical HTTPS origin and configured domain aliases,
  including path/query preservation, redirect loops and TLS failures. It rejects a latest
  backup that is stale, future-dated, empty, nonregular, missing its manifest, or corrupt.
- CI rejects tracked runtime environment files, credential exports and recovery artifacts.
  Ignore rules also cover environment variants and credential/DPAPI exports. This does not
  clean published history or revoke credentials.
- The main-protection script verifies the complete requested policy after applying it,
  including required CI, reviews, stale approval dismissal and administrator enforcement.
  It still needs an administrative GitHub connection to apply the policy.
- SMS configuration now requires an explicit sender, rejects the demo sender in production,
  and validates timeout and endpoint settings before making a request. `npm run check:sms`
  provides fixed, secret-free diagnostics inside the deployed container without sending
  a message. Deployment readiness includes this check; provider acceptance remains unproven.
- The read-only data audit rejects tenant-directory links to another location, matching
  the existing private-file serving and staging path-migration restrictions.
- Removed an unused student sharing demo with nonfunctional social/email buttons and an
  invalid `/certificates/:id` route. The active sharing flow remains in the verification page.
- Deployment/readiness documents distinguish current main, historical datasets and live
  evidence; stale branch and deployment instructions have been reconciled.

## Open PR reconciliation

| PR | Review and remaining action |
| --- | --- |
| #3 | Its original controlled-file foundation is in main. The useful remaining student lookup is incorporated locally with the newer sharing route/client preserved. Require CI on the reconciled result; the old head's failed audits are not cured by main's green checks. |
| #4 | Core safeguards and recovery tools already match main. The only remaining commits add two administrator credential exports. Do not merge these files. Remove them from the proposed tree and reconcile the superseded PR once GitHub access is available; address exposure/history separately. |
| #7 | Manual receipt upload, bank-detail administration, receipt-version checks and payment approval are already implemented in main. Direct comparisons of models, routes, services, email and receipt UI show that accepting the old files would remove trials, upgrades, paid-invoice records/emails, expiry workers, payer/bank snapshots and notifications. Preserve current behavior. The alternate standalone Hostinger stack does not belong in the active Dokploy rollout. Resolve the remote PR against current main and require checks on that exact result, or close it as superseded after confirming no remaining desired change. |

No remote PR was merged, closed or commented on. Branch protection remains unapplied
because no administrative GitHub credential was available on this workstation.

## Historical recovery material

The September 30 source archive, staging archive, uploads archive and application
configuration DPAPI files were checked. All four encrypted SHA-256 values matched their
manifests. Each file was also decrypted in memory under the existing Windows profile;
all four plaintext SHA-256 values matched the recorded originals. Plaintext recovery
files and secrets were not printed or written during this check.

These intact backups retain the original 14-certificate dataset. This check does not
establish portable off-server custody, a new successful database restore, signing-key
reencryption, reference recovery, path migration or an approved unsigned-certificate
policy. Those actions remain separate from the clean one-certificate `certiverxia`
inspection. Preserve the original institute identities and signing fingerprint; restore
missing records only from authoritative sources. No certificates were deleted, reassigned
or automatically re-signed.

## Access and decisions still required

- GitHub administration: apply branch protection, reconcile the open PRs, publish the
  reviewed changes and obtain current hosted checks. Coordinate historical-secret cleanup
  rather than overwriting current main with the stale cleaned mirror.
- Dokploy/SSH: apply the www fix, inspect runtime environment without exporting values,
  test upload persistence across recreation, and establish backup/schedule/restore and
  monitoring evidence. A read-only run of the new HTTPS checker still detects the live
  www `DEPTH_ZERO_SELF_SIGNED_CERT` failure before deployment.
- Atlas administration: verify network restrictions and separate database-user privileges.
  A working connection string does not grant access-list administration.
- Historical-data policy: decide whether to retain the older dataset separately or recover
  it in isolated staging before import, and decide how unsigned records should be presented.
- Provider accounts/test recipients: revoke exposed credentials, verify the replacement
  SMS token in the running service, and prove inbox/handset delivery and payment review.

## Validation

| Check | Result |
| --- | --- |
| Backend lint | Passed |
| Backend unit tests | Final run: 23 suites, 182 tests passed, including deployment-readiness, SMS configuration and a real cross-tenant directory-link regression |
| Frontend lint | Passed after the final route changes |
| Frontend suite | 23 files, 69 tests passed; a separate subsequent route regression run passed 2 more tests |
| Tooling tests | 5 tests passed, covering artifact rejection and complete branch-protection verification |
| SaaS-enabled frontend production build | Passed; no oversized-chunk warning |
| Repository artifact check | Passed on the current tracked source tree |
| Workflow and Dokploy Compose YAML | Parsed successfully; www TLS labels and runtime alias present |
| Live read-only HTTPS readiness check | Correctly failed on the existing www self-signed certificate |
| Four historical encrypted backup files | Encrypted and in-memory plaintext hashes all matched manifests |
| Local SMS configuration diagnostic | Passed without printing values or contacting Text.lk; the running production container remains unverified |

The first restricted frontend test run could not start two workers; it is not counted as
a passing full run. The retry outside that worker restriction passed all 69 tests. The
later routing tests passed separately. The previous main CI evidence remains attributable
to `f5dd55b6`; these workspace changes have not yet run in hosted CI. The backend integration
suite was not repeated for these frontend/deployment-tool changes; its previous successful
hosted result does not establish live production acceptance.

Docker image and runtime Compose validation require hosted CI or a machine with Docker;
parsing YAML alone does not establish that a live Traefik certificate was issued.
