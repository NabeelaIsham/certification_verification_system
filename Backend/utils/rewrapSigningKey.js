const crypto = require('crypto');

// Change encryption only. Never generate a replacement signing key during recovery.
function rewrapSigningKey(material, previousSecret, nextSecret) {
  if (!previousSecret || typeof nextSecret !== 'string' || nextSecret.length < 32 || previousSecret === nextSecret) {
    throw new Error('Distinct source and destination encryption secrets are required');
  }
  let plaintext;
  try {
    const parts = String(material?.encryptedPrivateKey || '').split('.');
    if (parts.length !== 3) throw new Error('Invalid key envelope');
    const [iv, tag, ciphertext] = parts.map(part => Buffer.from(part, 'base64url'));
    const derive = secret => crypto.createHash('sha256').update(secret).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', derive(previousSecret), iv);
    decipher.setAuthTag(tag);
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const privateKey = crypto.createPrivateKey(plaintext);
    const derivedPublic = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'der' });
    const storedPublic = crypto.createPublicKey(material.publicKey).export({ type: 'spki', format: 'der' });
    const keyId = `sha256:${crypto.createHash('sha256').update(derivedPublic).digest('hex')}`;
    if (!derivedPublic.equals(storedPublic) || keyId !== material.keyId) throw new Error('Key mismatch');
    const newIv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', derive(nextSecret), newIv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return {
      ...material,
      encryptedPrivateKey: [newIv, cipher.getAuthTag(), encrypted].map(part => part.toString('base64url')).join('.')
    };
  } catch {
    throw new Error('Original signing key recovery failed; no replacement key was generated');
  } finally { if (plaintext) plaintext.fill(0); }
}

module.exports = { rewrapSigningKey };
