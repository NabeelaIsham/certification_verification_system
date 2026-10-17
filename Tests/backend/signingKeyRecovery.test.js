const crypto = require('crypto');
const { rewrapSigningKey } = require('../../Backend/utils/rewrapSigningKey');
const oldSecret = 'old-key-encryption-secret'.repeat(2);
const newSecret = 'new-key-encryption-secret'.repeat(2);

function fixture() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const der = publicKey.export({ type: 'spki', format: 'der' });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', crypto.createHash('sha256').update(oldSecret).digest(), iv);
  const encrypted = Buffer.concat([cipher.update(privateKey.export({ type: 'pkcs8', format: 'pem' }), 'utf8'), cipher.final()]);
  return {
    keyId: `sha256:${crypto.createHash('sha256').update(der).digest('hex')}`,
    publicKey: publicKey.export({ type: 'spki', format: 'pem' }),
    encryptedPrivateKey: [iv, cipher.getAuthTag(), encrypted].map(buffer => buffer.toString('base64url')).join('.')
  };
}

test('rewrapping preserves the original signing identity and decrypts with the destination secret', () => {
  const original = fixture();
  const recovered = rewrapSigningKey(original, oldSecret, newSecret);
  expect(recovered.keyId).toBe(original.keyId);
  expect(recovered.publicKey).toBe(original.publicKey);
  expect(recovered.encryptedPrivateKey).not.toBe(original.encryptedPrivateKey);
  // A second verified rewrap proves the new ciphertext still holds the original private key.
  expect(rewrapSigningKey(recovered, newSecret, oldSecret).keyId).toBe(original.keyId);
  expect(() => rewrapSigningKey(recovered, oldSecret, newSecret)).toThrow(/recovery failed/);
});

test('rejects wrong encryption secrets, substituted public keys and incorrect fingerprints', () => {
  const original = fixture();
  expect(() => rewrapSigningKey(original, 'incorrect', newSecret)).toThrow(/recovery failed/);
  expect(() => rewrapSigningKey({ ...original, publicKey: fixture().publicKey }, oldSecret, newSecret)).toThrow(/recovery failed/);
  expect(() => rewrapSigningKey({ ...original, keyId: 'sha256:incorrect' }, oldSecret, newSecret)).toThrow(/recovery failed/);
});

test('requires a distinct destination secret of sufficient length', () => {
  for (const next of ['', 'short', oldSecret]) expect(() => rewrapSigningKey(fixture(), oldSecret, next)).toThrow();
});
