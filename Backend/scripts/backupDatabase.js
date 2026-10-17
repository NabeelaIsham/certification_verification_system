const fs = require('fs');
const path = require('path');
const { runMongoTool, hashFile } = require('../utils/mongoTools');
require('dotenv').config({ quiet: true });

const run = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  const directory = path.resolve(process.env.BACKUP_DIRECTORY || path.join(__dirname, '../backups'));
  fs.mkdirSync(directory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archive = path.join(directory, `certverify-${timestamp}.archive.gz`);
  const temporary = `${archive}.partial`;
  try {
    runMongoTool(process.env.MONGODUMP_PATH || 'mongodump', process.env.MONGODB_URI, [`--archive=${temporary}`, '--gzip']);
    const { size } = fs.statSync(temporary);
    if (!size) throw new Error('Database backup is empty');
    const checksum = await hashFile(temporary);
    fs.writeFileSync(`${archive}.sha256`, checksum + '\n', { mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, archive);
    console.log(`Database backup created: ${archive} (${size} bytes); SHA-256 manifest saved.`);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
};
if (require.main === module) {
  run().catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { run };
