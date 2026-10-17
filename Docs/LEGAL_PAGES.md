# Public legal pages

Terms: `/terms`. Privacy: `/privacy`. Both pages are public, linked in the site footer, and linked from registration in new tabs so an applicant does not lose an unfinished form. Content is in `Frontend/src/pages/LegalPages.jsx`; the displayed revision date is 9 October 2026.

The wording describes the current implementation: institute-supplied learner records, public verification, controlled share links, manual bank approval, annual paid packages, one registration trial, full-price upgrades, invoice emails, expiry, and browser token storage. It does not claim regulatory certification or a universal deletion deadline. Registration still sends the existing `agreeToTerms` field; this change does not add a server-side, versioned record of legal acceptance.

## Operator review before publishing

These are initial service-specific legal drafts, not a legal compliance determination. The operator should have the wording reviewed and confirm:

- The contracting legal entity, complete business address, and whether the provided support contact also handles privacy requests. Only the user-provided CERTIVERXIA name, address, phone, and email are used currently.
- The providers actually used for hosting, storage, email, and SMS; their processing countries and any required transfer arrangements. No unverified provider list or location guarantee is published.
- Production retention settings and the approved retention/deletion schedule for learner records, invoices, audit logs, and backups. Model defaults for verification and expired share logs are configurable; the policy intentionally does not promise those defaults as fixed live periods.
- Refund/dispute handling and how material policy changes will be communicated. Current package and upgrade wording preserves remedies required by applicable law.
- The respective institute/platform data responsibilities, basis for each processing purpose, and arrangements for children's records and privacy requests.

Reference checked: [Sri Lanka Data Protection Authority — official guidelines, legislation and gazettes](https://www.dpa.gov.lk/guidelines.php), including the 2025 amendment. The pages avoid asserting that every provision is already enforceable or that the service is legally compliant.

No deployment, external message, production account change, or bulk acceptance update is included.
