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

## Local verification (2026-10-11)

- Backend clean `npm ci`: successful, zero vulnerabilities.
- Full and production-only npm audits in both packages: zero vulnerabilities.
- Backend unit tests with coverage: 17 suites, 124 tests passed.
- Backend replica-set integration tests: 4 suites, 110 tests passed.
- Frontend: 17 test files, 46 tests passed with `--maxWorkers=2`. An earlier run alongside concurrent builds and backend tests timed out in two tests; the reduced-concurrency rerun passed.
- Both ESLint checks and the SaaS-enabled frontend production build passed.
- CI YAML parsed successfully; Jest discovery lists only the intended suites; `git diff --check` passed.

## Remaining assessment recommendations

The larger component/controller decomposition, authenticated API-client migration, cookie-based authentication, asset optimization and expanded API documentation are still outstanding. Cookie authentication also needs coordinated CSRF protection and deployment-origin handling.

GitHub branch protection and a green hosted CI run must be verified in the repository after these local changes are published. Docker was unavailable locally, so container validation remains in CI. The frontend build still reports its existing large-bundle warning.
