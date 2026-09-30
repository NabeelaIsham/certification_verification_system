const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { applyFilePaths } = require('../../Backend/scripts/normalizeStagingFilePaths');

describe('Staging file migration transactions', () => {
  let replica;
  beforeAll(async () => {
    replica = await MongoMemoryReplSet.create({ binary: { version: '8.0.17' }, replSet: { count: 1 } });
    await mongoose.connect(replica.getUri(), { dbName: 'certverify_staging_migration_test' });
    await mongoose.connection.db.createCollection('certificates');
  });
  beforeEach(async () => {
    await mongoose.connection.db.collection('certificates').deleteMany({});
    await mongoose.connection.db.collection('certificates').insertOne({ _id: 'test', image: 'before', qr: 'before-qr' });
  });
  afterAll(async () => {
    await mongoose.disconnect();
    if (replica) await replica.stop();
  });
  const change = (field, before, after) => ({ collection: 'certificates', id: 'test', field, before, after });
  test('commits all guarded changes together', async () => {
    await applyFilePaths(mongoose.connection, { blocked: 0, changes: [change('image', 'before', 'after'), change('qr', 'before-qr', 'after-qr')] });
    expect(await mongoose.connection.db.collection('certificates').findOne({ _id: 'test' })).toMatchObject({ image: 'after', qr: 'after-qr' });
  });
  test('a stale reference rolls back the entire migration', async () => {
    await expect(applyFilePaths(mongoose.connection, { blocked: 0, changes: [change('image', 'before', 'after'), change('qr', 'stale', 'after-qr')] })).rejects.toThrow(/Record changed/);
    expect(await mongoose.connection.db.collection('certificates').findOne({ _id: 'test' })).toMatchObject({ image: 'before', qr: 'before-qr' });
  });
});
