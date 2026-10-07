# Frontend review and student sharing

Reviewed checkout: `fix/priority-3-file-access`. This checkout does not contain the
later SaaS screens or `deploy/hostinger` deployment folder. This review is not a
production certification or a confirmation that every screen is visually tested.

## Fixed

- Replaced the routed student dashboard's hard-coded certificates and inert download
  button with a real certificate-code lookup using the existing verification API/page.
- Made `/student/dashboard` a public lookup page. The User schema supports only
  superadmin, institute and teacher roles; the old student-only guard made this route
  inaccessible. No private student list or authenticated API was made public.
- Added a Students navigation entry and accessible names/state to the mobile menu.
- Replaced placeholder social sharing with a reusable component on issued certificate
  verification results. LinkedIn, Facebook, WhatsApp and X links open a composer;
  the user confirms the post in that service. Native device sharing and copy are supported.
- Sharing always uses `https://certiverxia.com/verify/<encoded certificate code>`.
  It does not share session tokens, controlled-share tokens, or signed file-download URLs.
- Clipboard failure has manual-copy instructions. Cancelling native sharing is harmless.

## Evidence

- Frontend lint and production build passed; the existing large JavaScript chunk warning remains.
- All 19 frontend tests passed, including three new tests for canonical social URLs,
  clipboard rejection and student lookup navigation.
- All 86 backend unit tests passed (10 suites). Live database integration was not tested.
- Headless Edge preview at 390px and 1440px passed student lookup to verification with
  mocked certificate data; neither layout overflowed horizontally. The generated share
  URL was the expected Certiverxia URL. No social post was sent.

## Outstanding review findings

- This branch still shows VerifyAwards branding and old contact details; the later
  Certiverxia branding, SaaS and deployment work must be reconciled before release.
- Unused legacy components `student/CertificateView`, `student/DownloadCertificate`,
  `verification/ManualVerification` and `verification/QRScanner` contain demonstration
  behavior. They are not imported into current routes; do not wire them into production.
- Large page and management components mix data fetching, forms and rendering. Passing
  lint is not evidence that all of them are well-factored or accessible.
- Every role's real-data forms, tables, dialogs, empty/error states, keyboard navigation
  and mobile layouts still need systematic browser review against the release branch.
- The app is a client-rendered SPA. Certificate-specific social preview images/metadata
  are not generated here; platforms may show a generic or missing preview.
- Public share links require the actual certificates to exist in the production database
  and HTTPS deployment of certiverxia.com. Local fixture certificates are not published.
- Student account login and a private student certificate wallet are not implemented;
  students use codes or the controlled links supplied by their institute.

The next release review must use the intended consolidated branch, run database integration
tests, and validate the public domain and social composers on deployed data.
