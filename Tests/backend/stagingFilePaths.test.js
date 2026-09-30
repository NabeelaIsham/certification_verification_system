const fs = require('fs');
const os = require('os');
const path = require('path');
const { portablePath, planFilePaths, applyFilePaths } = require('../../Backend/scripts/normalizeStagingFilePaths');

describe('Staging file path migration', () => {
  const institute = '0123456789abcdef01234567';
  const relative = `uploads/generated/${institute}/certificate.png`;
  let root;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'certverify-paths-'));
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.writeFileSync(path.join(root, relative), 'restored image');
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  test.each(['C:/old/project/', '/old/project/', ''])('maps a verified restored file from %s', prefix => {
    expect(portablePath(prefix + relative, institute, 'generated', root)).toBe(relative);
  });
  test.each(['uploads/generated/other/certificate.png', `uploads/generated/${institute}/../certificate.png`, `uploads/generated/${institute}/missing.png`])('rejects an unsafe or missing file: %s', value => {
    expect(() => portablePath(value, institute, 'generated', root)).toThrow();
  });
  test('dry run only proposes changes and preserves already portable paths', async () => {
    const document = { _id: 'cert', instituteId: institute, generatedCertificateImage: `C:/old/${relative}` };
    const db = { collection: name => ({ find: () => ({ toArray: async () => name === 'certificates' ? [document] : [] }) }) };
    const plan = await planFilePaths(db, root);
    expect(plan.blocked).toBe(0);
    expect(plan.changes).toHaveLength(1);
    expect(document.generatedCertificateImage).toBe(`C:/old/${relative}`);
    document.generatedCertificateImage = relative;
    expect((await planFilePaths(db, root)).changes).toHaveLength(0);
  });
  test('refuses production and plans with missing files before starting a transaction', async () => {
    await expect(applyFilePaths({ db: { databaseName: 'certverify' } }, { changes: [], blocked: 0 })).rejects.toThrow(/staging/);
    await expect(applyFilePaths({ db: { databaseName: 'certverify_staging' } }, { changes: [], blocked: 1 })).rejects.toThrow(/blocked/);
  });
});
