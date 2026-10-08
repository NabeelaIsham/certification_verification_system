const fs = require('fs');
const os = require('os');
const path = require('path');
const { auditDeploymentData } = require('../../Backend/utils/deploymentDataAudit');

describe('Read-only deployment data audit', () => {
  let root;
  const database = (certificate, template = { _id: 't', instituteId: 'i' }) => {
    const rows = {
      certificates: [certificate], users: [{ _id: 'i' }],
      students: [{ _id: 's', instituteId: 'i' }],
      courses: [{ _id: 'c', instituteId: 'i' }], certificatetemplates: [template]
    };
    return { collection: name => ({ find: () => ({ toArray: async () => rows[name] }) }) };
  };
  const certificate = { instituteId: 'i', studentId: 's', courseId: 'c', templateId: 't' };
  beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'certverify-audit-')); });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  test('accepts portable files with complete tenant references', async () => {
    fs.mkdirSync(path.join(root, 'uploads/generated/i'), { recursive: true });
    fs.writeFileSync(path.join(root, 'uploads/generated/i/c.png'), 'test');
    const issues = await auditDeploymentData(database({ ...certificate, generatedCertificateImage: 'uploads/generated/i/c.png' }), root);
    expect(Object.values(issues).every(count => count === 0)).toBe(true);
  });

  test('reports orphan and cross-tenant references without changing records', async () => {
    const original = { ...certificate, studentId: 'missing' };
    const issues = await auditDeploymentData(database(original, { _id: 't', instituteId: 'other' }), root);
    expect(issues).toMatchObject({ missingReferences: 1, crossInstituteReferences: 1 });
    expect(original.studentId).toBe('missing');
  });

  test.each([
    ['C:\\old\\uploads\\generated\\i\\c.png', 'absoluteFileReferences'],
    ['/old/uploads/generated/i/c.png', 'absoluteFileReferences'],
    ['uploads/generated/other/c.png', 'unsafeFileReferences'],
    ['uploads/generated/i/../c.png', 'unsafeFileReferences'],
    ['uploads/generated/i/missing.png', 'missingFiles']
  ])('blocks a nonportable or unavailable file: %s', async (file, issue) => {
    const result = await auditDeploymentData(database({ ...certificate, generatedCertificateImage: file }), root);
    expect(result[issue]).toBe(1);
  });
});
