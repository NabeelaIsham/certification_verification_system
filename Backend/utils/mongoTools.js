const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const crypto = require('crypto');

const hashFile = async file => {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
};

// Database Tools accept a YAML config; JSON is valid YAML. Keeping the URI here
// avoids exposing credentials in process arguments or diagnostic output.
const runMongoTool = (executable, uri, args) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'certiverxia-mongo-'));
  const config = path.join(directory, 'connection.yml');
  try {
    fs.writeFileSync(config, JSON.stringify({ uri }), { mode: 0o600 });
    const result = spawnSync(executable, ['--config', config, ...args], { windowsHide: true, stdio: 'ignore' });
    if (result.error || result.status !== 0) throw new Error('MongoDB Database Tools command failed. Check installation, connectivity and database permissions.');
  } finally {
    if (fs.existsSync(config)) fs.unlinkSync(config);
    fs.rmdirSync(directory);
  }
};

module.exports = { runMongoTool, hashFile };
