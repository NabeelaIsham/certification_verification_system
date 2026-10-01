const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { applyFilePaths } = require('../../Backend/scripts/normalizeStagingFilePaths');
const { recoverSigningKey } = require('../../Backend/scripts/recoverStagingSigningKey');
const { rewrapSigningKey } = require('../../Backend/utils/rewrapSigningKey');
const crypto = require('crypto');

describe('Staging file migration transactions', () => {
  let replica;
  beforeAll(async () => {
    replica = await MongoMemoryReplSet.create({ binary: { version: '8.0.17' }, replSet: { count: 1 } });
    await mongoose.connect(replica.getUri(), { dbName: 'certverify_staging_migration_test' });
    await mongoose.connection.db.createCollection('certificates');
  });
  beforeEach(async () => {
    await mongoose.connection.db.collection('migrationaudits').deleteMany({});
    await mongoose.connection.db.collection('certificates').deleteMany({});
    await mongoose.connection.db.collection('certificates').insertOne({ _id: 'test', image: 'before', qr: 'before-qr' });
  });
  afterAll(async () => {
    await mongoose.disconnect();
    if (replica) await replica.stop();
  });
  const change = (field, before, after) => ({ collection: 'certificates', id: 'test', field, before, after });
  test('commits all guarded changes together', async () => {
    const result = await applyFilePaths(mongoose.connection, { blocked: 0, changes: [change('image', 'before', 'after'), change('qr', 'before-qr', 'after-qr')] });
    expect(result).toMatchObject({ fieldsModified: 2, documentsModified: 1 });
    const audit = await mongoose.connection.db.collection('migrationaudits').find({ migrationId: result.migrationId }).toArray();
    expect(audit).toHaveLength(2);
    expect(audit[0]).toMatchObject({ documentId: 'test', field: 'image', before: 'before', after: 'after' });
    expect(await mongoose.connection.db.collection('certificates').findOne({ _id: 'test' })).toMatchObject({ image: 'after', qr: 'after-qr' });
  });
  test('a stale reference rolls back the entire migration', async () => {
    await expect(applyFilePaths(mongoose.connection, { blocked: 0, changes: [change('image', 'before', 'after'), change('qr', 'stale', 'after-qr')] })).rejects.toThrow(/Record changed/);
    expect(await mongoose.connection.db.collection('certificates').findOne({ _id: 'test' })).toMatchObject({ image: 'before', qr: 'before-qr' });
    expect(await mongoose.connection.db.collection('migrationaudits').countDocuments()).toBe(0);
  });

  test('original-key recovery dry run leaves records untouched, then applies with an audit', async () => {
    const previousSecret = 'previous-encryption-secret'.repeat(2);
    const nextSecret = 'next-encryption-secret'.repeat(2);
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const der = publicKey.export({ type: 'spki', format: 'der' });
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', crypto.createHash('sha256').update(previousSecret).digest(), iv);
    const encrypted = Buffer.concat([cipher.update(privateKey.export({ type: 'pkcs8', format: 'pem' }), 'utf8'), cipher.final()]);
    const original = {
      keyId: `sha256:${crypto.createHash('sha256').update(der).digest('hex')}`,
      publicKey: publicKey.export({ type: 'spki', format: 'pem' }),
      encryptedPrivateKey: [iv, cipher.getAuthTag(), encrypted].map(part => part.toString('base64url')).join('.')
    };
    const instituteId = new mongoose.Types.ObjectId();
    const users = mongoose.connection.db.collection('users');
    await users.insertOne({ _id: instituteId, userType: 'institute', credentialSigning: original });
    const payload = Buffer.from(JSON.stringify({ certificateCode: 'RECOVERY-TEST' }));
    const credential = {
      keyId: original.keyId, publicKey: der.toString('base64url'), payloadEncoded: payload.toString('base64url'),
      signature: crypto.sign('sha256', payload, { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url')
    };
    const certificates = mongoose.connection.db.collection('certificates');
    await certificates.insertOne({ _id: 'signed', instituteId, credential });
    const options = { instituteId, previousSecret, nextSecret };
    expect(await recoverSigningKey(mongoose.connection, options)).toMatchObject({ mode: 'dry-run', identityPreserved: true, verifiedCertificates: 1 });
    expect((await users.findOne({ _id: instituteId })).credentialSigning).toEqual(original);
    expect(await mongoose.connection.db.collection('migrationaudits').countDocuments()).toBe(0);
    await certificates.updateOne({ _id: 'signed' }, { $set: { 'credential.signature': 'invalid' } });
    await expect(recoverSigningKey(mongoose.connection, { ...options, apply: true })).rejects.toThrow(/signatures failed/);
    expect((await users.findOne({ _id: instituteId })).credentialSigning).toEqual(original);
    await certificates.updateOne({ _id: 'signed' }, { $set: { credential } });
    await recoverSigningKey(mongoose.connection, { ...options, apply: true });
    expect((await certificates.findOne({ _id: 'signed' })).credential).toEqual(credential);
    const current = (await users.findOne({ _id: instituteId })).credentialSigning;
    expect(rewrapSigningKey(current, nextSecret, previousSecret).keyId).toBe(original.keyId);
    expect(await mongoose.connection.db.collection('migrationaudits').countDocuments({ operation: 'rewrap-original-signing-key', documentId: instituteId })).toBe(1);
    await expect(recoverSigningKey(mongoose.connection, { ...options, apply: true })).rejects.toThrow();
    expect(await mongoose.connection.db.collection('migrationaudits').countDocuments()).toBe(1);
  });
});
