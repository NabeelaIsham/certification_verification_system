# Assessment remediation

## Dependency and CI repairs

- Regenerated both npm lockfiles with compatible security updates, including sharp 0.35.5, proxy-addr 2.0.8, and source-map-js 1.2.2.
- Replaced Nodemon with Node 22's native `node --watch server.js`, removing the vulnerable development watcher dependency chain.
- Scoped the js-yaml 4 override to `@istanbuljs/load-nyc-config`. That loader uses the supported `load` API; a regression test verifies YAML coverage configuration. This removes the old argparse/sprintf-js chain without downgrading Jest. Revisit the override when the upstream loader updates its dependency.
- CI runs lint, tests, integration tests, build, full audits and production-only audits independently. Matrix fail-fast is disabled, and audit failures still fail the workflow.
- Narrowed Jest's roots so unrelated local worktrees cannot create package-name collisions.

## Application cleanup

- `Backend/app.js` exports the Express application independently of HTTP listening, database connections, background workers and process signal registration.
- `Backend/server.js` remains the executable entry point; package metadata now agrees.
- Added shared error middleware with safe messages, stable codes, valid HTTP status handling and headers-sent delegation. Regression tests cover malformed JSON, payload limits and rejected async handlers.
- Removed unused empty placeholders. Extracted plan validation, catalogue defaults and transactional plan operations from subscription routes.
- Replaced browser alerts with a shared toast notification service. Password-change notifications survive the redirect to login.
- Fixed the receipt test to await React's asynchronous download state update.

## Local verification (2026-10-11 through 2026-10-13)

- Backend clean `npm ci`: successful, zero vulnerabilities.
- Full and production-only npm audits in both packages: zero vulnerabilities.
- Backend unit tests with coverage: 22 suites, 152 tests passed.
- Backend replica-set integration tests: 4 suites, 113 tests passed.
- Frontend: 21 test files, 58 tests passed with `--maxWorkers=2`.
- Both ESLint checks and the SaaS-enabled frontend production build passed.
- CI YAML parsed successfully; Jest discovery lists only the intended suites; `git diff --check` passed.

## Additional assessment fixes

- Split the verification portal, template designer and certificate management into views, hooks and data helpers. Split teacher/admin controllers by responsibility, with shared teacher permission validation and classroom query services.
- Centralized frontend Axios access, credential handling, timeouts, opt-in read retries, error messages and session-expiration events.
- Migrated browser authentication to HttpOnly/Secure/SameSite cookies, with explicit origin/header CSRF checks and server-verified startup. Bearer API clients remain supported.
- Removed remaining unused empty source placeholders. The shared logger emits structured, redacted error diagnostics and is silent in tests. SMS errors omit raw provider responses, and authenticated SMS calls require HTTPS and refuse redirects.
- Fixed camera cleanup after an asynchronous fallback start finishes after navigation; added a regression test. Added full-route cookie login/2FA/logout integration coverage and template drag/payload regression tests.
- Updated both checkout actions to v7. Optimized embedded-raster SVG exports: favicon 847,957 to 87,624 bytes; logo 692,675 to 318,311 bytes. Render comparisons at declared dimensions differ by at most one channel level.
- Added deployment checks, persistent-storage probing, credential-safe database backup execution, checksummed isolated restore drills and a branch-protection script.

See [production readiness](production-readiness.md) for live observations, rollout instructions, history-cleanup preparation, and the account-dependent work still pending. The apex domain passed health/HTTPS checks; **www currently fails certificate validation**.

GitHub branch protection and a green hosted CI run must be verified in the repository after these local changes are published. Docker was unavailable locally, so container validation remains in CI. The frontend build still reports its existing large-bundle warning.
