const crypto = require('crypto');

const CREDENTIAL_VERSION = '1.0';
const CREDENTIAL_FORMAT = 'VerifyAwardsCredential';
const SIGNING_ALGORITHM = 'ECDSA-P256-SHA256';

let warnedAboutFallbackSecret = false;

const toBase64Url = (value) => Buffer.from(value).toString('base64url');
const fromBase64Url = (value) => Buffer.from(value, 'base64url');

const getEncryptionKey = () => {
  const secret = process.env.CREDENTIAL_KEY_ENCRYPTION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('CREDENTIAL_KEY_ENCRYPTION_SECRET is required to protect signing keys');
  }

  if (!process.env.CREDENTIAL_KEY_ENCRYPTION_SECRET && !warnedAboutFallbackSecret) {
    console.warn('CREDENTIAL_KEY_ENCRYPTION_SECRET is missing; using JWT_SECRET as a development fallback.');
    warnedAboutFallbackSecret = true;
  }

  return crypto.createHash('sha256').update(secret).digest();
};

const encryptPrivateKey = (privateKeyPem) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(privateKeyPem, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map(toBase64Url).join('.');
};

const decryptPrivateKey = (encryptedValue) => {
  const [ivValue, tagValue, cipherValue] = String(encryptedValue || '').split('.');
  if (!ivValue || !tagValue || !cipherValue) {
    throw new Error('Institute signing key is malformed');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    fromBase64Url(ivValue)
  );
  decipher.setAuthTag(fromBase64Url(tagValue));
  return Buffer.concat([
    decipher.update(fromBase64Url(cipherValue)),
    decipher.final()
  ]).toString('utf8');
};

const generateSigningMaterial = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  const publicKeyDer = crypto.createPublicKey(publicKey).export({ type: 'spki', format: 'der' });
  return {
    keyId: `sha256:${crypto.createHash('sha256').update(publicKeyDer).digest('hex')}`,
    algorithm: SIGNING_ALGORITHM,
    publicKey,
    encryptedPrivateKey: encryptPrivateKey(privateKey),
    createdAt: new Date()
  };
};

const ensureInstituteSigningKey = async (institute) => {
  let signingOwner = institute;
  if (
    institute.credentialSigning?.publicKey &&
    !institute.credentialSigning?.encryptedPrivateKey &&
    institute.constructor?.findById
  ) {
    signingOwner = await institute.constructor
      .findById(institute._id)
      .select('+credentialSigning.encryptedPrivateKey');
  }

  if (
    signingOwner.credentialSigning?.publicKey &&
    signingOwner.credentialSigning?.encryptedPrivateKey &&
    signingOwner.credentialSigning?.keyId
  ) {
    return signingOwner.credentialSigning;
  }

  signingOwner.credentialSigning = {
    ...generateSigningMaterial(),
    previousKeys: []
  };
  await signingOwner.save();
  institute.credentialSigning = signingOwner.credentialSigning;
  return signingOwner.credentialSigning;
};

const rotateInstituteSigningKey = async (institute, { compromised = false } = {}) => {
  let signingOwner = institute;
  if (institute.constructor?.findById) {
    signingOwner = await institute.constructor
      .findById(institute._id)
      .select('+credentialSigning.encryptedPrivateKey');
  }
  const current = await ensureInstituteSigningKey(signingOwner);
  const previousKeys = (current.previousKeys || []).map((key) => key.toObject?.() || key);
  previousKeys.push({
    keyId: current.keyId,
    algorithm: current.algorithm,
    publicKey: current.publicKey,
    status: compromised ? 'compromised' : 'retired',
    retiredAt: new Date()
  });

  signingOwner.credentialSigning = {
    ...generateSigningMaterial(),
    previousKeys,
    rotatedAt: new Date()
  };
  await signingOwner.save();
  return {
    keyId: signingOwner.credentialSigning.keyId,
    algorithm: signingOwner.credentialSigning.algorithm,
    publicKey: signingOwner.credentialSigning.publicKey,
    createdAt: signingOwner.credentialSigning.createdAt,
    rotatedAt: signingOwner.credentialSigning.rotatedAt,
    previousKeys: signingOwner.credentialSigning.previousKeys
  };
};

const isCredentialKeyTrusted = (credentialSigning, keyId) => {
  if (!credentialSigning || !keyId) return false;
  if (credentialSigning.keyId === keyId) return true;
  return (credentialSigning.previousKeys || []).some(
    (key) => key.keyId === keyId && key.status !== 'compromised'
  );
};

const buildCredentialPayload = ({
  certificateCode,
  studentName,
  courseName,
  awardDate,
  institute,
  validUntil
}) => ({
  '@context': ['https://www.w3.org/ns/credentials/v2'],
  type: ['VerifiableCredential', 'EducationCertificateCredential'],
  id: `urn:verifyawards:certificate:${certificateCode}`,
  issuer: {
    id: `urn:verifyawards:institute:${institute._id}`,
    name: institute.instituteName
  },
  validFrom: new Date(awardDate).toISOString(),
  ...(validUntil ? { validUntil: new Date(validUntil).toISOString() } : {}),
  credentialSubject: {
    name: studentName,
    achievement: {
      name: courseName
    }
  },
  credentialStatus: {
    id: `${(process.env.API_URL || 'http://localhost:5000').replace(/\/+$/, '')}/api/certificates/verify/${certificateCode}`,
    type: 'VerifyAwardsStatus'
  },
  certificateCode
});

const createSignedCredential = async (data) => {
  const signingKey = await ensureInstituteSigningKey(data.institute);
  const payload = buildCredentialPayload(data);
  const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
  const privateKey = decryptPrivateKey(signingKey.encryptedPrivateKey);
  const signatureBytes = crypto.sign('sha256', payloadBytes, {
    key: privateKey,
    dsaEncoding: 'ieee-p1363'
  });
  const publicKeyDer = crypto
    .createPublicKey(signingKey.publicKey)
    .export({ type: 'spki', format: 'der' });

  const compact = {
    v: CREDENTIAL_VERSION,
    p: toBase64Url(payloadBytes),
    s: toBase64Url(signatureBytes),
    k: toBase64Url(publicKeyDer),
    kid: signingKey.keyId,
    a: 'ES256'
  };

  return {
    version: CREDENTIAL_VERSION,
    format: CREDENTIAL_FORMAT,
    payload,
    payloadEncoded: compact.p,
    signature: compact.s,
    algorithm: SIGNING_ALGORITHM,
    keyId: signingKey.keyId,
    publicKey: compact.k,
    hash: crypto.createHash('sha256').update(payloadBytes).digest('hex'),
    signedAt: new Date(),
    compactToken: toBase64Url(Buffer.from(JSON.stringify(compact), 'utf8'))
  };
};

const credentialToCompactToken = (credential) => {
  if (!credential?.payloadEncoded || !credential?.signature || !credential?.publicKey) {
    return null;
  }
  return toBase64Url(Buffer.from(JSON.stringify({
    v: credential.version,
    p: credential.payloadEncoded,
    s: credential.signature,
    k: credential.publicKey,
    kid: credential.keyId,
    a: 'ES256'
  }), 'utf8'));
};

const verifyStoredCredential = (credential) => {
  if (!credential?.payloadEncoded || !credential?.signature || !credential?.publicKey) {
    return { valid: false, reason: 'unsigned' };
  }

  try {
    const payloadBytes = fromBase64Url(credential.payloadEncoded);
    const publicKey = crypto.createPublicKey({
      key: fromBase64Url(credential.publicKey),
      type: 'spki',
      format: 'der'
    });
    const computedKeyId = `sha256:${crypto
      .createHash('sha256')
      .update(fromBase64Url(credential.publicKey))
      .digest('hex')}`;
    const valid = crypto.verify('sha256', payloadBytes, {
      key: publicKey,
      dsaEncoding: 'ieee-p1363'
    }, fromBase64Url(credential.signature));
    const parsedPayload = JSON.parse(payloadBytes.toString('utf8'));
    const hash = crypto.createHash('sha256').update(payloadBytes).digest('hex');
    const validOverall = valid &&
      (!credential.hash || credential.hash === hash) &&
      (!credential.keyId || credential.keyId === computedKeyId);
    return {
      valid: validOverall,
      payload: parsedPayload,
      hash,
      keyId: computedKeyId,
      reason: validOverall ? null : 'invalid_signature'
    };
  } catch (error) {
    return { valid: false, reason: 'malformed_credential', error: error.message };
  }
};

const validateSigningKeyMaterial = (credentialSigning) => {
  try {
    if (
      !credentialSigning?.encryptedPrivateKey ||
      !credentialSigning?.publicKey ||
      !credentialSigning?.keyId
    ) {
      return false;
    }
    const privateKey = decryptPrivateKey(credentialSigning.encryptedPrivateKey);
    const challenge = crypto.randomBytes(32);
    const signature = crypto.sign('sha256', challenge, {
      key: privateKey,
      dsaEncoding: 'ieee-p1363'
    });
    const signatureValid = crypto.verify('sha256', challenge, {
      key: credentialSigning.publicKey,
      dsaEncoding: 'ieee-p1363'
    }, signature);
    const publicKeyDer = crypto
      .createPublicKey(credentialSigning.publicKey)
      .export({ type: 'spki', format: 'der' });
    const keyId = `sha256:${crypto.createHash('sha256').update(publicKeyDer).digest('hex')}`;
    return signatureValid && keyId === credentialSigning.keyId;
  } catch {
    return false;
  }
};

const buildSignedVerificationUrl = (certificateCode, credential) => {
  const path = buildOnlineVerificationUrl(certificateCode);
  const token = credentialToCompactToken(credential) || credential?.compactToken;
  // Keep the portable credential in the URL fragment. Fragments remain in the browser and
  // are not sent in HTTP requests, reverse-proxy logs, Referer headers, or analytics URLs.
  return token ? `${path}#credential=${encodeURIComponent(token)}` : path;
};

const buildOnlineVerificationUrl = (certificateCode) => {
  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  return `${baseUrl}/verify/${encodeURIComponent(certificateCode)}`;
};

module.exports = {
  CREDENTIAL_VERSION,
  CREDENTIAL_FORMAT,
  SIGNING_ALGORITHM,
  buildCredentialPayload,
  buildOnlineVerificationUrl,
  buildSignedVerificationUrl,
  createSignedCredential,
  credentialToCompactToken,
  ensureInstituteSigningKey,
  isCredentialKeyTrusted,
  rotateInstituteSigningKey,
  validateSigningKeyMaterial,
  verifyStoredCredential
};
