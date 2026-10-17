const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { runMongoTool, hashFile } = require('../utils/mongoTools');

async function run() {
  const uri = process.env.RESTORE_MONGODB_URI;
  const sourceDatabase = process.env.BACKUP_SOURCE_DATABASE;
  const archive = path.resolve(process.argv[2] || '');
  if (!uri || !/^[a-zA-Z0-9_-]+$/.test(sourceDatabase || '') || !process.argv[2]) {
    throw new Error('Provide RESTORE_MONGODB_URI, BACKUP_SOURCE_DATABASE and an archive path.');
  }
  const database = new URL(uri).pathname.slice(1);
  if (!/^certverify_restore_check_[a-z0-9_]+$/.test(database) || database === sourceDatabase) {
    throw new Error('The restore target must be a dedicated certverify_restore_check_<unique-name> database.');
  }
  const expected = fs.readFileSync(`${archive}.sha256`, 'utf8').trim();
  const actual = await hashFile(archive);
  if (expected !== actual) throw new Error('Backup checksum verification failed.');
  await mongoose.connect(uri, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 10000 });
  if ((await mongoose.connection.db.listCollections().toArray()).length) throw new Error('Restore target is not empty; refusing to overwrite data.');
  runMongoTool(process.env.MONGORESTORE_PATH || 'mongorestore', uri, [
    `--archive=${archive}`, '--gzip', '--stopOnError',
    `--nsInclude=${sourceDatabase}.*`, `--nsFrom=${sourceDatabase}.*`, `--nsTo=${database}.*`
  ]);
  const collections = await mongoose.connection.db.listCollections().toArray();
  if (!collections.length) throw new Error('No collections restored. Check the archive source database.');
  const counts = {};
  for (const collection of collections) counts[collection.name] = await mongoose.connection.db.collection(collection.name).countDocuments();
  console.log(JSON.stringify({ status: 'restored', targetDatabase: database, counts,
    remaining: 'Compare counts with the backup source and run application/tenant checks on this isolated database. This script does not delete the restored database.' }, null, 2));
}
if (require.main === module) run().catch(() => { console.error('Restore drill failed. Verify the isolated target, checksum, tools and permissions; no connection secrets are logged.'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
module.exports = { run };
