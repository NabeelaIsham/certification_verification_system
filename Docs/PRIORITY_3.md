# Priority 3: controlled files

Certificate images, QR files, template backgrounds and template assets are no longer
served by public static middleware. Institute logos remain public branding. The private
file API derives ownership from the authenticated account; teachers also need issuance
permission and assignment to the certificate/template course. User-supplied filesystem
paths are never used as route parameters. Stored paths are checked against the owning
institute's directory, including real-path checks that reject linked files.

## Delivery contract

- `/api/private-files/certificates/:code/image`, `/qr`, `/download`: authenticated
  institute or authorized teacher. Institute previews and links load authenticated blobs.
- `/api/private-files/templates/:id/background` and `/:assetIndex`: the same ownership
  checks, including teacher course assignments. Template previews use authenticated blobs.
- Public verification returns credential details, status and signature results. It does
  not return image/QR URLs, filesystem paths, internal lifecycle records or compact payloads.
- Opening a share atomically consumes one view. If image disclosure is permitted, it
  grants five minutes to display/download that image without consuming another view.
  Each file request rechecks share expiry/revocation, image disclosure, institute ownership,
  and active certificate status. Exhaustion prevents new views; the final counted view's
  grant works for its remaining five minutes. Previously downloaded copies cannot be revoked.
- Certificate emails now link to a controlled share (72 hours, 25 views). Failed email
  delivery revokes the newly created share. Existing static links in old emails stop working;
  use the existing resend action to send a controlled link.

Files and share responses use `private, no-store` and `no-referrer`. File responses disable
ETags, last-modified responses and ranges. Nginx does not log share paths or private-file
query strings. Backend logs omit query strings, share tokens and referrers. Do not enable
external proxy/CDN caching or URL/query logging for these endpoints. Purge any existing
CDN caches of `/uploads/generated` and `/uploads/qrcodes` during deployment.

## Storage and uploads

The pilot uses the existing persistent filesystem upload volume. MongoDB stores metadata
and file references, not binary image payloads. New issuance/regeneration uses paths
relative to Backend, making the volume portable between hosts. Existing absolute paths
remain supported on their original host; normalize them in the restored staging copy
before moving between Windows and Linux. A private object-storage provider is a later
deployment choice; do not expose a public bucket to reproduce the old static URLs.

Template backgrounds/assets and logos are decoded and reencoded as PNG. Declared MIME,
decoded format, allowed extension, byte limit and dimension/pixel limits are enforced.
Generated filenames replace client filenames. Failed multi-file validation removes partial
files, and template creation failures clean their uploads. No arbitrary document upload
route is supported: PDFs/SVGs/executables are rejected. Reencoding strips metadata and
trailing payloads; it is not an antivirus scan. Add quarantining and malware scanning before
supporting arbitrary document formats.

## Validation and rollout

Run backend unit tests and `npm run test:integration`, frontend tests, both linters and the
production build. Integration tests use a disposable local replica set, not Atlas. They
cover private routes, cross-institute IDs, teacher assignment, grants, concurrent share
views, revoked/expired shares/certificates, public verification, delivery email links,
upload spoofing, limits and failure cleanup. Frontend tests cover authenticated blobs,
object URL cleanup and access-token destination restrictions.

Deploy the backend, frontend and proxy changes together. Keep this branch stacked on
Priority 2 until its staging gate passes. Actual Atlas migration/restoration, persisted
volume survival, off-server backups, secret rotation and production monitoring remain
operational gates; passing local tests does not complete them.
