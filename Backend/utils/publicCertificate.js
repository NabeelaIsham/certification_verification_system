const { verifyStoredCredential, isCredentialKeyTrusted } = require('./credentialService');

const normalizeCertificateCode = value => {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9-]{2,99}$/.test(code) ? code : null;
};

const inspectPublicCertificate = certificate => {
  const status = certificate.status === 'issued' && certificate.validUntil && new Date(certificate.validUntil) <= new Date()
    ? 'expired' : certificate.status;
  const signature = verifyStoredCredential(certificate.credential);
  const trusted = Boolean(signature.valid && isCredentialKeyTrusted(certificate.instituteId?.credentialSigning, signature.keyId));
  const imageAllowed = status === 'issued' && (!certificate.credential?.signature || trusted);
  return { status, signature, trusted, imageAllowed };
};

const publicCertificateLinks = code => {
  // Use configured public origin, never an untrusted Host / forwarded header or
  // a stored verification URL that may belong to an earlier deployment.
  const origin = new URL(process.env.FRONTEND_URL || 'http://localhost:3000').origin;
  const encoded = encodeURIComponent(code);
  return {
    page: `${origin}/certificate/${encoded}`,
    verify: `${origin}/verify/${encoded}`,
    image: `${origin}/api/certificates/verify/${encoded}/image`
  };
};

module.exports = { normalizeCertificateCode, inspectPublicCertificate, publicCertificateLinks };
