const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

async function run() {
  const file = path.resolve(__dirname, '../uploads/.persistence-probe.json');
  if (process.argv[2] === 'write') {
    const id = crypto.randomUUID();
    await fs.writeFile(file, JSON.stringify({ id, createdAt: new Date().toISOString() }), { flag: 'wx', mode: 0o600 });
    console.log(`Probe created. After recreating the backend container, run: node scripts/storageProbe.js verify ${id}`);
  } else if (process.argv[2] === 'verify') {
    const probe = JSON.parse(await fs.readFile(file, 'utf8'));
    if (!process.argv[3] || probe.id !== process.argv[3]) throw new Error('Probe does not match');
    console.log('The expected storage probe survived. Confirm that the container was recreated between these commands.');
    await fs.unlink(file);
  } else throw new Error('Usage: storageProbe.js write | verify <probe-id>');
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
