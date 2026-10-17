# Manual subscription payments

The receipt workflow is implemented in the shared subscription services and dashboards.
PR #7 was reconciled with current `main` on 2026-10-17; the newer authentication,
tenant isolation, subscription lifecycle, and receipt safeguards are retained.

## Institute flow

1. Open Subscription and usage and select a package.
2. Read the bank account and exact purchased amount. Use the selected package name
   as the transfer's payment reference (for example, `Professional`).
3. Enter the bank transaction number, payer name, payment date and optional notes.
   Upload a JPEG or PNG receipt, at most 5 MB.
   A screenshot/photo can be used for a PDF receipt; PDF upload is not supported.
4. Wait for manual review. A submitted receipt does not activate a subscription or credits.
5. If rejected, read the reason, correct the details and submit again.

The package reference is copied from the immutable subscription snapshot on the server.
The bank transaction number is separate, normalized to uppercase, and uniquely indexed
across subscription proofs. The submitted bank instructions are saved with the proof.
Do not use the package name in place of a transaction number.

## Administrator flow

Open Admin → Subscriptions, download the submitted receipt, and check it against the
actual bank transaction, package reference and amount. Enter the amount received and
confirm verification before selecting Record payment and activate. Alternatively reject
the receipt with a reason. Approval remains manual; there is no PayHere or automatic charge.

Approval requires the current receipt version and matching transaction number and exact
package price. Credits, payment record, status and audit event are written transactionally.
Concurrent approval is idempotent. An older receipt cannot approve a corrected submission.
Approval also queues an invoice email. A delivery failure does not undo payment approval;
the queued email can retry. The owning institute and super admins can download the approved
payment's PDF receipt, including after subscription expiry. Other institutes and teachers
cannot download these private receipts or review payments.

## Bank configuration

Open **Super Admin → Subscriptions → Bank account for manual payments**. Enter
the bank name, account holder, account number and branch, then select **Save bank details**.
Only super admins can update these details. Changes persist in MongoDB and are audited.
No server restart is needed. Institutes see the latest saved account when opening payment
instructions or selecting **Refresh bank details**. Existing receipts and payments are preserved.

For initial setup only, these environment variables provide a fallback until dashboard
settings have been saved. Saved dashboard details take precedence:

```dotenv
PAYMENT_BANK_NAME=
PAYMENT_ACCOUNT_HOLDER=
PAYMENT_ACCOUNT_NUMBER=
PAYMENT_BANK_BRANCH=
```

All four are required when using the environment fallback. Missing details display a
contact message and block receipt upload. Environment-only changes require a restart;
dashboard changes do not. Configure the account actually used to receive institute payments.
Enable `SAAS_ENABLED=true` and build the frontend with `VITE_SAAS_ENABLED=true`.

## Storage and rollout

Receipts are decoded and re-encoded as JPEG, stripping original metadata. The image is
stored in the subscription document in MongoDB (up to 5 MB); it is excluded from normal
query results. A dedicated authenticated download permits the owning institute or a
super admin only, with private/no-store response headers. Receipts therefore belong in
database backup and retention planning; they are not public uploads.

Verify the subscription and payment uniqueness indexes through the reviewed database
preparation process before opening uploads. Existing pending subscriptions need a receipt
before they can activate; already paid subscriptions remain valid. Use staging test accounts
to verify the flow before deploying. See [production readiness](production-readiness.md)
and the [Dokploy guide](../deploy/dokploy/README.md) for deployment and recovery checks.

## Automated checks

From `Frontend`, run `npm test -- --run` and `npm run lint`. The receipt and bank-editor
tests cover the upload form, configured bank details, preserved account-number leading
zeroes, and failed saves. From `Backend`, run `npm test`, `npm run test:integration`, and
`npm run lint`. Integration tests use disposable MongoDB replica sets and cover private
downloads, unauthenticated/teacher access, cross-institute access, admin-only review,
invalid images, rejection and resubmission, stale approvals, concurrent activation,
credit allocation, and approved receipt access after expiry.

CI also audits both dependency sets and builds the production images. These checks do not
establish live bank settlement, email delivery, Atlas permissions, backup restoration,
or production rollout. Record those results separately using appropriate test accounts.
