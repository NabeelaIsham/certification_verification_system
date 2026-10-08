# Packages, trials, and manual payments

## Institute experience

- A newly registered institute receives one free 14-day trial in the same database transaction as its account. The trial starts at registration. Existing OTP and institute approval requirements still apply before account access.
- Trial limits and features are copied from the `Starter` plan at registration. If the catalogue has not been created yet, the default Starter allowances are 100 certificates, 2 teachers, and 2 templates, with bulk issuance and secure sharing. Later Starter edits do not change existing trial allowances.
- The trial is shared by the institute and its teachers. It cannot be restarted by replaying registration or requesting a package. Existing accounts are not automatically given a new trial.
- Choosing an annual package opens `/institute/subscription/checkout/:planId`, reserves its price and limits, and redirects to `/institute/subscription/payment/:subscriptionId`. Signed-out users return to checkout after login.
- The payment page displays bank details, package amount, and transfer reference. Institutes submit payer name, payment date, transaction number, optional notes, and one JPEG/PNG receipt up to 5 MB.
- Submission does not activate paid credits. An unexpired trial remains usable during review. The payment page refreshes approval status automatically and when focused.
- Unsubmitted or rejected requests can be cancelled to change packages. A submitted receipt must first be reviewed. Rejected receipts display the administrator's reason and can be corrected and resubmitted.

## Super admin setup and review

Open **Packages & Payments** in the super admin dashboard.

1. Expand **Bank account settings**, enter bank name, account holder, account number, and branch, then save. These details can be added or updated at any time without a server restart. No bank account is fabricated or seeded. Without configured details, payment upload is unavailable.
2. Publish the desired annual packages. The initial catalogue action creates Starter, Professional, and Business. Edit Starter to control allowances for future trials.
3. Review the **Payment approvals** queue. Receipt submission also creates an in-app notification for active super admins. Download the private receipt and inspect its payer, date, transaction number, notes, and the bank account shown at submission.
4. Enter the amount actually received, confirm bank verification, and activate. The amount must match the reserved package price. Only the currently submitted receipt version can be approved. Alternatively reject it with an explanation.

Approval ends the remaining trial and starts a fresh 12-month paid term with the purchased allowance. Trial consumption is retained in its own ledger. If trial certificate issuance is still processing, approval asks the administrator to retry after it finishes. Approval and rejection create institute notifications and audit events. Notifications here are in-app records, not email delivery.

## Storage and compatibility

- Keep `SAAS_ENABLED=true` on the backend and `VITE_SAAS_ENABLED=true` in the frontend build. MongoDB transactions require a replica set, as in the existing subscription system.
- Bank instructions are stored in `BankPaymentDetails`. Environment-provided payment bank details remain a fallback until an admin saves settings.
- Uploaded images are decoded, size-checked, re-encoded to JPEG, and stored privately with the subscription. Receipt download requires the owning institute or a super admin. Normal subscription responses omit receipt bytes.
- The existing paid-subscription uniqueness index is preserved. A separate permanent index permits only one trial per institute. Existing paid packages, prices, and usage ledgers remain intact.
- Existing pending requests must submit a receipt before activation. No live data backfill or external deployment is performed by this change.

## Verification

Backend unit tests, the database-backed `priority2` integration suite, and frontend tests cover trial allocation and expiry, payment submission/privacy, administrative bank settings, rejection/resubmission, exact-price approval, idempotent activation, credit accounting, checkout routing, and pending-state UI. Browser layout checks use mock bank data only; no real payment is submitted.
