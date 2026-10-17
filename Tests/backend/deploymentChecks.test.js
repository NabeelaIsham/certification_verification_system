const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { checkHttpsRouting, checkRecentBackup } = require('../../Backend/utils/deploymentChecks');

const canonical = 'https://certiverxia.com';
const probe = '/health?readiness=1';
const reply = (status, location, body = { database: 'connected' }) => ({
  status, headers: { get: name => name === 'location' ? location : null }, json: async () => body
});
function requestWithRoutes(overrides = {}) {
  const routes = {
    [`${canonical}/health`]: reply(200),
    [`http://certiverxia.com${probe}`]: reply(301, `${canonical}${probe}`),
    [`http://www.certiverxia.com${probe}`]: reply(308, `https://www.certiverxia.com${probe}`),
    [`https://www.certiverxia.com${probe}`]: reply(301, `${canonical}${probe}`),
    ...overrides
  };
  return jest.fn(async url => {
    if (!routes[url]) throw new Error('Unexpected destination');
    if (routes[url] instanceof Error) throw routes[url];
    return routes[url];
  });
}

test('routing checks validate www TLS and both redirects with the original path and query', async () => {
  const request = requestWithRoutes();
  await expect(checkHttpsRouting(canonical, 'www.certiverxia.com', request)).resolves.toMatchObject({ aliasesChecked: 1 });
  expect(request).toHaveBeenCalledWith(`https://www.certiverxia.com${probe}`, expect.objectContaining({ redirect: 'manual' }));
  expect(request).toHaveBeenCalledWith(`http://www.certiverxia.com${probe}`, expect.any(Object));
});

test.each([
  ['an unrelated host', `https://unrelated.invalid${probe}`],
  ['a missing path', `${canonical}/`],
  ['a missing query', `${canonical}/health`],
  ['an HTTPS downgrade', `http://certiverxia.com${probe}`],
  ['embedded credentials', `https://user:password@certiverxia.com${probe}`]
])('routing rejects %s without following it', async (_name, location) => {
  const request = requestWithRoutes({ [`http://certiverxia.com${probe}`]: reply(301, location) });
  await expect(checkHttpsRouting(canonical, '', request)).rejects.toThrow('canonical destination');
  expect(request).toHaveBeenCalledTimes(2);
});

test.each([
  ['invalid TLS', new Error('self-signed certificate')],
  ['missing www router', reply(404)],
  ['redirect loop', reply(301, `https://www.certiverxia.com${probe}`)]
])('healthy apex does not hide %s', async (_name, response) => {
  const request = requestWithRoutes({ [`https://www.certiverxia.com${probe}`]: response });
  await expect(checkHttpsRouting(canonical, 'www.certiverxia.com', request)).rejects.toThrow();
});

test('routing rejects unhealthy backend and invalid alias configuration', async () => {
  const request = requestWithRoutes({ [`${canonical}/health`]: reply(200, null, { database: 'disconnected' }) });
  await expect(checkHttpsRouting(canonical, '', request)).rejects.toThrow('health failed');
  const unused = jest.fn();
  await expect(checkHttpsRouting(canonical, 'https://other.invalid/path', unused)).rejects.toThrow('hostnames only');
  await expect(checkHttpsRouting('http://certiverxia.com', '', unused)).rejects.toThrow('HTTPS');
  expect(unused).not.toHaveBeenCalled();
});

describe('backup evidence', () => {
  let directory;
  const now = Date.UTC(2026, 9, 16, 12);
  async function archive(name = 'certverify-current.archive.gz', ageHours = 1) {
    const filename = path.join(directory, name);
    const contents = Buffer.from('fixture archive bytes');
    await fs.writeFile(filename, contents);
    await fs.writeFile(`${filename}.sha256`, crypto.createHash('sha256').update(contents).digest('hex') + '\n');
    const time = new Date(now - ageHours * 3600000);
    await fs.utimes(filename, time, time);
    return filename;
  }
  beforeEach(async () => { directory = await fs.mkdtemp(path.join(os.tmpdir(), 'certiverxia-backup-check-')); });
  afterEach(async () => {
    const target = path.resolve(directory);
    if (path.dirname(target) !== path.resolve(os.tmpdir()) || !path.basename(target).startsWith('certiverxia-backup-check-')) {
      throw new Error('Refusing to remove a directory outside this test fixture');
    }
    await fs.rm(target, { recursive: true, force: true });
  });
  test('passes only a recent archive whose content matches its manifest', async () => {
    await archive();
    await expect(checkRecentBackup(directory, now)).resolves.toMatchObject({ checksumVerified: true, ageHours: 1 });
  });
  test.each([36, 48, -1])('rejects an archive with age %s hours', async age => {
    await archive('certverify-old.archive.gz', age);
    await expect(checkRecentBackup(directory, now)).rejects.toThrow('age');
  });
  test('does not fall back to an older good archive when the latest is corrupt', async () => {
    await archive('certverify-older.archive.gz', 2);
    const filename = await archive();
    await fs.writeFile(`${filename}.sha256`, '0'.repeat(64));
    await expect(checkRecentBackup(directory, now)).rejects.toThrow('checksum mismatch');
  });
  test.each(['missing', 'malformed', 'empty', 'directory'])('rejects %s backup evidence', async failure => {
    const filename = await archive();
    if (failure === 'missing') await fs.unlink(`${filename}.sha256`);
    if (failure === 'malformed') await fs.writeFile(`${filename}.sha256`, 'not a checksum');
    if (failure === 'empty') await fs.truncate(filename, 0);
    if (failure === 'directory') { await fs.unlink(filename); await fs.mkdir(filename); }
    await expect(checkRecentBackup(directory, now)).rejects.toThrow();
  });
  test('ignores incomplete dumps and fails when no complete archive exists', async () => {
    await fs.writeFile(path.join(directory, 'certverify-current.archive.gz.partial'), 'partial');
    await expect(checkRecentBackup(directory, now)).rejects.toThrow('No regular nonempty');
  });
});
