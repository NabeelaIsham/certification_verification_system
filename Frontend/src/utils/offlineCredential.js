const decodeBase64Url = (value) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const decodeUtf8 = (bytes) => new TextDecoder().decode(bytes);

export const extractCredentialToken = (input) => {
  if (!input || typeof input !== 'string') return '';
  try {
    const url = new URL(input, window.location.origin);
    const fragment = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
    const fragmentParams = new URLSearchParams(fragment);
    return fragmentParams.get('credential') || url.searchParams.get('credential') || '';
  } catch {
    return '';
  }
};

export const verifyOfflineCredential = async (token) => {
  if (!token) {
    throw new Error('The QR code does not contain an offline credential');
  }
  if (!window.crypto?.subtle) {
    throw new Error('This browser does not support offline cryptographic verification');
  }

  const compact = JSON.parse(decodeUtf8(decodeBase64Url(token)));
  if (compact.v !== '1.0' || compact.a !== 'ES256') {
    throw new Error('Unsupported credential format');
  }

  const payloadBytes = decodeBase64Url(compact.p);
  const signatureBytes = decodeBase64Url(compact.s);
  const publicKeyBytes = decodeBase64Url(compact.k);
  const publicKey = await window.crypto.subtle.importKey(
    'spki',
    publicKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );
  const signatureValid = await window.crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    signatureBytes,
    payloadBytes
  );
  if (!signatureValid) {
    throw new Error('The credential signature is invalid');
  }

  const payload = JSON.parse(decodeUtf8(payloadBytes));
  return {
    certificateCode: payload.certificateCode,
    studentName: payload.credentialSubject?.name,
    courseName: payload.credentialSubject?.achievement?.name,
    awardDate: payload.validFrom,
    validUntil: payload.validUntil,
    instituteName: payload.issuer?.name,
    status: payload.validUntil && new Date(payload.validUntil) <= new Date() ? 'expired' : 'offline-unconfirmed',
    offline: true,
    credential: {
      signed: true,
      signatureValid: true,
      issuerKeyTrusted: false,
      keyId: compact.kid,
      algorithm: 'ECDSA-P256-SHA256',
      verificationNote: 'Signature valid offline. Current lifecycle status and issuer registry trust require an online check.'
    }
  };
};
