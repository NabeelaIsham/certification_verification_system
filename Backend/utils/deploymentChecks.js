const fs = require('fs/promises');
const path = require('path');
const { hashFile } = require('./mongoTools');

const REDIRECTS = new Set([301, 302, 307, 308]);
const PROBE_PATH = '/health?readiness=1';

async function checkHttpsRouting(frontendUrl, aliases = '', request = fetch) {
  const canonical = new URL(frontendUrl);
  if (canonical.protocol !== 'https:' || canonical.username || canonical.password) {
    throw new Error('HTTPS frontend origin is required');
  }
  const hosts = [...new Set(aliases.split(',').map(value => value.trim().toLowerCase()).filter(Boolean))];
  if (hosts.some(host => !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host))) {
    throw new Error('PUBLIC_DOMAIN_ALIASES must contain hostnames only');
  }
  const get = url => request(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  const health = await get(`${canonical.origin}/health`);
  if (health.status !== 200 || (await health.json()).database !== 'connected') {
    throw new Error('Canonical HTTPS health failed');
  }
  const destination = `${canonical.origin}${PROBE_PATH}`;
  async function checkRedirect(start, aliasOrigin) {
    let current = start;
    for (let hop = 0; hop < 3; hop += 1) {
      const response = await get(current);
      const location = response.headers.get('location');
      if (!REDIRECTS.has(response.status) || !location) throw new Error('Missing canonical redirect');
      const next = new URL(location, current);
      if (next.href === destination) return;
      // HTTP aliases may first upgrade to HTTPS on the same host. Never follow
      // an unexpected host, path/query rewrite, downgrade, or credentialed URL.
      if (!aliasOrigin || next.origin !== aliasOrigin || next.protocol !== 'https:' ||
          next.username || next.password || next.pathname + next.search !== PROBE_PATH || next.hash) {
        throw new Error('Redirect does not preserve the canonical destination');
      }
      current = next.href;
    }
    throw new Error('Canonical redirect loop');
  }
  await checkRedirect(`${canonical.origin.replace('https:', 'http:')}${PROBE_PATH}`);
  for (const host of hosts.filter(host => host !== canonical.host)) {
    const origin = `https://${host}`;
    await checkRedirect(`${origin}${PROBE_PATH}`, origin);
    await checkRedirect(`http://${host}${PROBE_PATH}`, origin);
  }
  return { aliasesChecked: hosts.length, note: 'TLS, public backend health and canonical redirects with path/query preservation passed.' };
}

async function checkRecentBackup(directory, now = Date.now()) {
  const names = (await fs.readdir(directory)).filter(name => /^certverify-.*\.archive\.gz$/.test(name));
  const archives = await Promise.all(names.map(async name => ({ name, stat: await fs.lstat(path.join(directory, name)) })));
  const latest = archives.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)[0];
  if (!latest || !latest.stat.isFile() || latest.stat.size === 0) throw new Error('No regular nonempty logical backup');
  const age = now - latest.stat.mtimeMs;
  if (age < 0 || age >= 36 * 60 * 60 * 1000) throw new Error('Latest backup age is invalid or exceeds 36 hours');
  const archive = path.join(directory, latest.name);
  const manifest = `${archive}.sha256`;
  const manifestStat = await fs.lstat(manifest);
  if (!manifestStat.isFile() || manifestStat.size > 128) throw new Error('Invalid backup checksum manifest');
  const expected = (await fs.readFile(manifest, 'utf8')).trim();
  if (!/^[a-f0-9]{64}$/i.test(expected) || (await hashFile(archive)) !== expected.toLowerCase()) {
    throw new Error('Backup checksum mismatch');
  }
  const after = await fs.lstat(archive);
  if (!after.isFile() || after.size !== latest.stat.size || after.mtimeMs !== latest.stat.mtimeMs) {
    throw new Error('Backup changed during validation');
  }
  return { ageHours: Math.round(age / 360000) / 10, sizeBytes: latest.stat.size, checksumVerified: true,
    note: 'Latest local archive matches its SHA-256 manifest. Scheduling, off-server storage and restore success require separate evidence.' };
}

module.exports = { checkHttpsRouting, checkRecentBackup };
