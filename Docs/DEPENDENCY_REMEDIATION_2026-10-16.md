# PR #3 dependency and repository-artifact remediation

The backend audit in [job 117053954032](https://github.com/NabeelaIsham/certification_verification_system/actions/runs/38924937301/job/117053954032)
failed on `fix/priority-3-file-access` at `9d423b2e`. Auditing its lockfiles on
2026-10-16 found 37 backend findings (one critical, 30 high, five moderate and one
low) and one high frontend finding. These counts include affected dependency
chains, not 38 independent defects in application code.

## Dependency changes

| Dependency | Previous version | Repaired version or replacement |
| --- | --- | --- |
| Backend `proxy-addr` | 2.0.7 | 2.0.8 |
| Backend `sharp` | 0.35.4 | 0.35.5 |
| Backend Jest | 30.2.0 | 30.5.2, eliminating its `micromatch`/`braces` chain |
| Backend `nodemon` | 3.1.10 | Node 22's built-in `node --watch server.js` |
| Backend `js-yaml` under `@istanbuljs/load-nyc-config` | 3.15.2 | Scoped override to 4.3.2, removing `argparse` 1 and `sprintf-js` |
| Backend DOMPurify | 3.4.15 | 3.4.17 |
| Frontend `source-map-js` | 1.2.1 | 1.2.2 |

The patched versions address the published [proxy-addr advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h),
[sharp advisory](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) and
[source-map-js advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).
The YAML override is restricted to the NYC configuration loader, which uses the
supported `load` API. Lockfiles were updated without `npm audit fix --force`.

CI continues to fail on high or critical audit findings. Dependabot configuration
requests daily npm update checks for both package directories once accepted on
the default branch. All three checkout steps use `actions/checkout@v7`, and the
workflow token has read-only repository contents permission.

## Repository artifact cleanup

Commit `9d423b2e` also tracked the local `.history-cleanup/repository.git` mirror
and four Python cache files. The cleanup untracks all 36 files and preserves the
local copies. Ignore rules now exclude recovery mirrors, credential exports,
runtime environment files and Python caches. The existing main-branch artifact
guard and its tests run in this branch's CI too.

Removing these files from the proposed tree does not remove earlier commits or
revoke exposed credentials. Credential rotation and coordinated history cleanup
remain separate work. Do not publish the old recovery mirror over current history.

## Validation

Validated locally on 2026-10-17 with Node 22.14.0 and npm 11.10.1:

- Clean `npm ci` installations succeed for Backend and Frontend.
- Full and production-only `npm audit --audit-level=high` checks succeed for both
  projects with zero reported vulnerabilities in all four results.
- Backend lint and 86 unit tests pass.
- All 66 database integration tests pass against a disposable MongoDB replica
  set, including tenant isolation, transactional issuance and protected files.
- Frontend lint, all 19 tests and the production build pass. The existing
  955 KB JavaScript bundle still triggers Vite's bundle-size warning.
- The artifact guard and both of its tests pass. Local recovery files remain
  present and are ignored by Git.
- Workflow/Dependabot YAML parsing and required audit steps were checked. A
  YAML configuration fixture loads correctly through NYC with the scoped
  `js-yaml` override. Linux/Alpine native dependency entries remain in the locks.

Docker is unavailable locally, so image builds still require GitHub CI. These
results apply to this branch's current tests; they do not establish production
readiness or authorize deployment before the stacked dependencies are accepted.
