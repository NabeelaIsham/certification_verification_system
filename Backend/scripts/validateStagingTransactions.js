const crypto = require('crypto');
const mongoose = require('mongoose');

async function validateTransactions(connection) {
  const name = `_staging_probe_${crypto.randomUUID().replace(/-/g, '')}`;
  const collection = await connection.db.createCollection(name);
  const session = await connection.startSession();
  try {
    await session.withTransaction(async () => { await collection.insertOne({ phase: 'committed' }, { session }); });
    const intentionalAbort = new Error('intentional rollback');
    try {
      await session.withTransaction(async () => {
        await collection.insertOne({ phase: 'aborted' }, { session });
        throw intentionalAbort;
      });
    } catch (error) { if (error !== intentionalAbort) throw error; }
    if (await collection.countDocuments({ phase: 'committed' }) !== 1 || await collection.countDocuments({ phase: 'aborted' }) !== 0) {
      throw new Error('Transaction commit or rollback validation failed');
    }
    return { committed: 1, rolledBack: true };
  } finally {
    await session.endSession();
    // Drop only the unique collection created by this invocation.
    await collection.drop();
  }
}

async function main() {
  const uri = process.env.STAGING_MONGODB_URI;
  if (!uri) throw new Error('STAGING_MONGODB_URI is required; there is no production fallback');
  const database = new URL(uri).pathname.slice(1);
  if (!/^certverify_staging(?:_[a-z0-9_]+)?$/.test(database)) throw new Error('Use a dedicated certverify_staging database');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  await validateTransactions(mongoose.connection);
  console.log('Staging transaction commit and rollback: passed. Migration/restoration still require separate validation.');
}
if (require.main === module) {
  main().catch(() => {
    console.error('Staging transaction check failed. Check staging configuration, network access and database permissions. No URI or credentials are logged.');
    process.exitCode = 1;
  }).finally(() => mongoose.disconnect());
}
module.exports = { validateTransactions };
