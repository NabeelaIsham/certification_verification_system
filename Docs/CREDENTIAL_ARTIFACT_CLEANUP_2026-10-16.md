# Credential artifact cleanup - 2026-10-16

CI job 117047430914 rejected two tracked administrator credential exports on
`fix/priority-4-5-operations`, the source branch for PRs #4 and #8:

- `.local-secrets/certiverxia-production-admin.credential.xml`
- `.local-secrets/mikenium-superadmin.credential.xml`

The cleanup removes both exports from the proposed source tree and brings the
branch's ignore rules into line with main. The repository artifact check stays
enabled. No account, application data or certificate signing key is changed.

Local credentials belong in an operating-system credential vault outside the
repository. Configure deployment secrets through the deployment secret store.
Commit only environment examples with placeholder values. Ignore rules do not
untrack files already committed.

## Work still requiring verification

- Rotate the affected administrator account credentials and invalidate existing
  sessions through the authorized account-management process. Record the date
  and verification result without recording secret values. Rotation has not
  been verified as part of this cleanup.
- The exports remain in earlier Git commits. Coordinate history cleanup across
  affected branches, tags, pull requests and collaborator clones. Preserve
  certificate verification continuity and recovery material. Do not force-push
  an old cleanup mirror over current repository history.
- A passing source-tree check is not proof of credential rotation or a completed
  history purge. Review the new CI run before merging; do not deploy stacked
  changes before their dependencies are accepted.
