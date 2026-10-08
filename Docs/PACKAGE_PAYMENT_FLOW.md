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

Approval ends the remaining trial and starts a fresh 12-month paid term with the purchased allowance. Trial consumption is retained in its own ledger. If trial certificate issuance is still processing, approval asks the administrator to retry after it finishes. Approval and rejection create institute notifications and audit events. Approval also queues an email with a PDF invoice marked PAID; rejection notifications remain in-app.

## Paid upgrades and invoice emails

- An active paid subscriber can choose a higher-priced published package that preserves all current limits and enabled features. My Package shows eligible upgrades; stopped packages require super admin assistance first.
- The upgrade uses the same bank transfer, proof upload, and approval flow. The displayed full annual price is charged; no proration, refunds, or carryover of credits or remaining time is applied. These terms appear on both the package selection and payment pages.
- The current package remains usable until its own expiry or upgrade approval. Approval atomically closes it and activates the replacement with a fresh annual term and fresh allowances, retaining historical usage and payment records. Approval waits for in-progress issuance to finish. Rejected or cancelled upgrade requests do not stop the current package.
- Each newly approved payment queues one durable `PaymentInvoiceEmail` job in the approval transaction. The background worker sends the approved PDF to the institute email, retries failures, and recovers abandoned jobs after restarts. Repeated approval calls do not create extra invoices or jobs. SMTP delivery has the same at-least-once caveat as expiry emails. Existing historic approvals are not retroactively emailed.
- At startup, subscription index preparation installs separate unique constraints for one pending request and one current paid package, then removes the recognized legacy combined constraint. Run normal backend initialization before using upgrades, and avoid running older backend versions alongside this release.

## Expiry, subscriber analytics, and approved receipts

- Package access ends at the stored expiry time, even before the background worker processes the subscription. Login, renewal, existing records, and payment receipts remain accessible.
- With SaaS enabled, the backend runs an expiry worker at startup and every minute. It records expiry, creates an in-app notification, and queues an email for the institute. Failed email deliveries retry automatically with increasing delays. Configure the existing SMTP and email-delivery settings and keep the backend running for delivery. Tests mock SMTP; no live expiry email was sent during development.
- Email jobs survive restarts and use leases to coordinate workers. Delivery is at least once: a crash after SMTP accepts a message but before its delivery record is saved can cause a duplicate. Replaced trials do not receive misleading expiry notices.
- **Packages & Payments** now shows global subscriber and revenue totals, monthly revenue, package distribution, and searchable, paginated subscriber records. Records include start/expiry, submission/review and status-change dates and times, usage, and expiry-email delivery status. Displayed timestamps use Sri Lanka time; monthly revenue buckets use UTC.
- Expand a subscriber's **Manage package and payment** section to stop or resume an unexpired trial or paid package with a reason. Stopping immediately disables package features for the institute and its teachers. Resuming does not extend the original expiry date. Changes are audited.
- Approving a payment creates a downloadable CERTIVERXIA PDF receipt with its receipt number, amount, bank reference, package term, approval time, and approving administrator. The institute can select **Download approved receipt (PDF)** in payment history or its approved payment page. Super admins can also download it from subscriber records. **Download uploaded proof** remains a separate action for the original bank proof.
- Approved receipt details are saved at approval and remain available after expiry. Only the owning institute and super admins can download them; legacy payments fall back to available historical subscription details.

## Storage and compatibility

- Keep `SAAS_ENABLED=true` on the backend and `VITE_SAAS_ENABLED=true` in the frontend build. MongoDB transactions require a replica set, as in the existing subscription system.
- Bank instructions are stored in `BankPaymentDetails`. Environment-provided payment bank details remain a fallback until an admin saves settings.
- Uploaded images are decoded, size-checked, re-encoded to JPEG, and stored privately with the subscription. Receipt download requires the owning institute or a super admin. Normal subscription responses omit receipt bytes.
- Separate paid-subscription indexes allow one current paid package and one pending upgrade per institute. A permanent index permits only one registration trial. Existing paid packages, prices, and usage ledgers remain intact.
- Existing pending requests must submit a receipt before activation. No live data backfill or external deployment is performed by this change.

## Verification

Backend unit tests, the database-backed `priority2` integration suite, and frontend tests cover trial allocation and expiry, payment submission/privacy, administrative bank settings, rejection/resubmission, exact-price approval, idempotent activation, credit accounting, checkout routing, and pending-state UI. Browser layout checks use mock bank data only; no real payment is submitted.

The `subscriptionLifecycle` integration suite additionally covers expiry enforcement, SMTP retry and lease recovery, concurrent workers, trial suspension, approved receipt ownership and snapshots, and complete paginated analytics. Frontend tests cover subscriber search, timestamps, stop-package actions, and PDF downloads.
