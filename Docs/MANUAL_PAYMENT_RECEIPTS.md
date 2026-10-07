# Manual subscription payments

This implementation is in branch `feat/manual-payment-receipts`, based on the SaaS
branch, in `worktrees/manual-payments`. The original working checkout is unchanged.

## Institute flow

1. Open Subscription and usage and select a package.
2. Read the bank account and exact purchased amount. Use the selected package name
   as the transfer's payment reference (for example, `Professional`).
3. Enter the bank transaction number and upload a JPEG or PNG receipt, at most 5 MB.
   A screenshot/photo can be used for a PDF receipt; PDF upload is not supported.
4. Wait for manual review. A submitted receipt does not activate a subscription or credits.
5. If rejected, read the reason, correct the details and submit again.

The package reference is copied from the immutable subscription snapshot on the server.
The bank transaction number is separate and unique across submitted subscription proofs.
Do not use the package name in place of a transaction number.

## Administrator flow

Open Admin → Subscriptions, download the submitted receipt, and check it against the
actual bank transaction, package reference and amount. Enter the amount received and
confirm verification before selecting Record payment and activate. Alternatively reject
the receipt with a reason. Approval remains manual; there is no PayHere or automatic charge.

Approval requires the current receipt version and matching transaction number and exact
package price. Credits, payment record, status and audit event are written transactionally.
Concurrent approval is idempotent. An older receipt cannot approve a corrected submission.

## Bank configuration

Set these backend environment variables using the real account details:

```dotenv
PAYMENT_BANK_NAME=
PAYMENT_ACCOUNT_HOLDER=
PAYMENT_ACCOUNT_NUMBER=
PAYMENT_BANK_BRANCH=
```

All four are required. Missing details display a contact message and block receipt upload.
No bank details have been invented or configured. Restart the backend after changing them.
Enable `SAAS_ENABLED=true` and build the frontend with `VITE_SAAS_ENABLED=true`.

## Storage and rollout

Receipts are decoded and re-encoded as JPEG, stripping original metadata. The image is
stored in the subscription document in MongoDB (up to 5 MB); it is excluded from normal
query results. A dedicated authenticated download permits the owning institute or a
super admin only, with private/no-store response headers. Receipts therefore belong in
database backup and retention planning; they are not public uploads.

Create the new unique partial index for payment transaction numbers through the existing
database preparation process before opening uploads. Existing pending subscriptions need
a receipt before they can activate; already paid subscriptions remain valid. No production
database or live account has been changed by this implementation. Run staging validation
and merge the reviewed branch before deploying.

## Validation completed

22 frontend tests and 89 MongoDB replica-set integration tests passed, including
private receipt download, cross-tenant rejection, image validation, rejection/resubmission,
stale approval prevention, manual activation and credit allocation. Frontend/backend lint
and the SaaS-enabled production build passed. A headless Edge mobile preview completed
the upload form using mocked requests without horizontal overflow. No live payment was
submitted; actual bank details and staging/deployment validation remain required.
