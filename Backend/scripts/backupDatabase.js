const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

dotenv.config();

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

const backupDirectory = path.resolve(
  process.env.BACKUP_DIRECTORY || path.join(__dirname, '../backups')
);
fs.mkdirSync(backupDirectory, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const archivePath = path.join(backupDirectory, `certverify-${timestamp}.archive.gz`);
const mongodump = process.env.MONGODUMP_PATH || 'mongodump';
const result = spawnSync(mongodump, [
  `--uri=${mongoUri}`,
  `--archive=${archivePath}`,
  '--gzip'
], {
  stdio: 'inherit',
  windowsHide: true
});

if (result.error) {
  console.error(`Database backup failed: ${result.error.message}`);
  console.error('Install MongoDB Database Tools or set MONGODUMP_PATH to the mongodump executable.');
  process.exit(1);
}
if (result.status !== 0) {
  console.error(`Database backup failed with exit code ${result.status}`);
  process.exit(result.status || 1);
}

const stats = fs.statSync(archivePath);
console.log(`Database backup created: ${archivePath} (${stats.size} bytes)`);
