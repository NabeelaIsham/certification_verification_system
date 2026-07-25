# Certification Verification System

## Credential security features

The certificate workflow includes:

- ECDSA P-256 signed education credentials with a W3C Verifiable Credentials-compatible payload
- Scannable short-link QR codes with server-side signature, issuer-key, and lifecycle verification
- Online registered-issuer-key and current lifecycle-status checks
- Lifecycle history for issuance, suspension, reinstatement, revocation, and superseding
- Selective, expiring, view-limited share links with server-side token hashing and revocation
- Privacy-preserving verification logs and rule-based suspicious-activity alerts

The full signed credential remains stored with the certificate. Printed certificate QR codes use
a short verification URL so they remain reliably scannable at normal template sizes; scanning
therefore requires connectivity for the current signature and lifecycle check.

## Local Setup

### Backend

1. Copy `.env.example` to `.env`
2. Fill in your MongoDB and email settings
3. Set separate, random values for `JWT_SECRET`, `CREDENTIAL_KEY_ENCRYPTION_SECRET`, and
   `VERIFICATION_PRIVACY_SECRET`. The credential-key secret encrypts institute private keys using
   AES-256-GCM and must never be exposed to the frontend.
4. Install dependencies

```bash
cd Backend
npm install
```

5. Start the backend

```bash
npm run dev
```

### Frontend

1. Install dependencies

```bash
cd Frontend
npm install
```

2. Start the frontend

```bash
npm run dev
```

## Testing

### Backend

```bash
cd Backend
npm test
```

### Frontend

```bash
cd Frontend
npm test
```

## CI

A GitHub Actions workflow is configured at `.github/workflows/ci.yml`.

## Docker

A simple Docker image can be built for the backend with the provided `docker-compose.yml`.

## Using the secure credential workflow

1. Issue an individual, teacher, or bulk certificate normally. Signing is automatic.
2. Scan its QR code. Online verification checks the stored signature, registered issuer key, and
   current lifecycle state.
3. In the institute certificate screen, suspend, reinstate, or revoke a credential and inspect
   its lifecycle history.
4. Use **Create Share Link** to configure expiry and view limits. **Manage Shares** displays usage
   and revokes active links. Raw share tokens are only returned when created and are never stored.
5. Open the **Security** tab to inspect verification outcomes, risk scores, and triggered rules.
6. Use **Sign Legacy Certificate** to regenerate older certificate images and QR codes with a
   signed credential.

Controlled sharing currently uses institute authorization because the project does not yet have
authenticated student accounts. Student self-service can later reuse the same share service
behind student authorization middleware.
