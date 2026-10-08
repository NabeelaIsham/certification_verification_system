jest.mock('../../Backend/utils/emailService', () => ({ sendCertificateEmail: jest.fn(), sendCredentialShareEmail: jest.fn() }));
process.env.NODE_ENV = 'test';
process.env.SAAS_ENABLED = 'false';
process.env.JWT_SECRET = 'priority-two-test-only-secret';
process.env.CREDENTIAL_KEY_ENCRYPTION_SECRET = 'priority-two-test-only-encryption-secret';
process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:3000';
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const request = require('supertest');
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const { app } = require('../../Backend/server');
const { signAccessToken } = require('../../Backend/config/jwt');
const User = require('../../Backend/models/User');
const Student = require('../../Backend/models/Student');
const Course = require('../../Backend/models/Course');
const Template = require('../../Backend/models/CertificateTemplate');
const Certificate = require('../../Backend/models/Certificate');
const Operation = require('../../Backend/models/CertificateIssuance');
const Lock = require('../../Backend/models/IssuanceLock');
const Event = require('../../Backend/models/IssuanceEvent');
const Share = require('../../Backend/models/CredentialShare');
const VerificationLog = require('../../Backend/models/VerificationLog');
const service = require('../../Backend/services/certificateIssuanceService');
const rendering = require('../../Backend/services/certificateRenderingService');
const email = require('../../Backend/utils/emailService');
const { resetRateLimitStores } = require('../../Backend/middleware/rateLimit');
let replset, a, b, teacher, token, teacherToken, courseA, courseB, studentA, studentB, templateA, templateB, certificateB, shareB;
const uploadRoot = path.resolve(__dirname, '../../Backend/uploads');
const ownedDirs = new Set();
const id = () => new mongoose.Types.ObjectId();
const payload = (overrides = {}) => ({ studentId: String(studentA._id), courseId: String(courseA._id), templateId: String(templateA._id), awardDate: '2026-09-01', ...overrides });
const issue = (overrides = {}) => service.issue({ actorId: a._id, input: payload(), idempotencyKey: 'test-request-key-0001', ...overrides });
const api = (method, url, body = {}, auth = token) => request(app)[method](url).set('Authorization', `Bearer ${auth}`).send(body);

beforeAll(async () => {
  replset = await MongoMemoryReplSet.create({ binary: { version: '8.0.17' }, replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replset.getUri(), { dbName: 'priority2_tests' });
  for (const model of Object.values(mongoose.models)) await model.init();
}, 300000);

beforeEach(async () => {
  jest.restoreAllMocks(); jest.clearAllMocks(); resetRateLimitStores();
  for (const model of Object.values(mongoose.models)) await model.deleteMany({});
  a = { _id: id(), userType: 'institute', email: 'a@example.com', instituteName: 'Institute A', isActive: true, isVerifiedByAdmin: true };
  b = { _id: id(), userType: 'institute', email: 'b@example.com', instituteName: 'Institute B', isActive: true, isVerifiedByAdmin: true };
  await User.collection.insertMany([a, b]);
  courseA = await Course.create({ instituteId: a._id, courseCode: 'A1', courseName: 'A Course' });
  courseB = await Course.create({ instituteId: b._id, courseCode: 'B1', courseName: 'B Course' });
  studentA = await Student.create({ instituteId: a._id, courseId: courseA._id, name: 'Student A', email: 'student@example.com' });
  studentB = await Student.create({ instituteId: b._id, courseId: courseB._id, name: 'Student B', email: 'student@example.com' });
  for (const institute of [a, b]) {
    for (const folder of ['templates', 'template-assets', 'generated', 'qrcodes', 'logos']) {
      const dir = path.join(uploadRoot, folder, String(institute._id)); ownedDirs.add(dir);
      await fs.mkdir(dir, { recursive: true });
    }
    await sharp({ create: { width: 800, height: 600, channels: 3, background: '#fff' } }).png().toFile(path.join(uploadRoot, 'templates', String(institute._id), 'test.png'));
  }
  templateA = await Template.create({ instituteId: a._id, courseId: courseA._id, templateName: 'A template', templateImage: `uploads/templates/${a._id}/test.png`, isActive: true });
  templateB = await Template.create({ instituteId: b._id, courseId: courseB._id, templateName: 'B template', templateImage: `uploads/templates/${b._id}/test.png`, isActive: true });
  certificateB = await Certificate.create({ instituteId: b._id, studentId: studentB._id, courseId: courseB._id, templateId: templateB._id,
    certificateCode: 'BBB-260901-ABCDEFGHJK', studentName: studentB.name, courseName: courseB.courseName, awardDate: new Date(), status: 'issued' });
  shareB = await Share.create({ institute: b._id, certificate: certificateB._id, tokenHash: 'b'.repeat(64), expiresAt: new Date(Date.now() + 60000), maxViews: 10, createdBy: b._id });
  teacher = { _id: id(), userType: 'teacher', instituteId: a._id, email: 'teacher@example.com', isActive: true,
    assignedCourses: [courseA._id], permissions: { canIssueCertificates: true, canCreateStudents: true, canEditStudents: true } };
  await User.collection.insertOne(teacher);
  token = signAccessToken(a); teacherToken = signAccessToken(teacher);
});

afterEach(async () => {
  for (const dir of ownedDirs) {
    const relative = path.relative(uploadRoot, dir);
    if (!/^(templates|template-assets|generated|qrcodes|logos)[\\/][a-f\d]{24}$/.test(relative)) throw new Error('Unsafe test cleanup path');
    await fs.rm(dir, { recursive: true, force: true });
  }
  ownedDirs.clear();
});
afterAll(async () => { await mongoose.disconnect(); await replset?.stop(); });

test.each([
  ['get', () => `/api/students/${studentB._id}`, {}],
  ['put', () => `/api/students/${studentB._id}`, { email: 'forged@example.com' }],
  ['delete', () => `/api/students/${studentB._id}`, {}],
  ['put', () => `/api/students/${studentB._id}/status`, { status: 'inactive' }],
  ['get', () => `/api/students/by-course/${courseB._id}`, {}],
  ['get', () => `/api/courses/${courseB._id}`, {}],
  ['put', () => `/api/courses/${courseB._id}`, { courseName: 'forged' }],
  ['delete', () => `/api/courses/${courseB._id}`, {}],
  ['get', () => `/api/certificate-templates/${templateB._id}`, {}],
  ['put', () => `/api/certificate-templates/${templateB._id}/fields`, { fields: [] }],
  ['delete', () => `/api/certificate-templates/${templateB._id}`, {}],
  ['get', () => `/api/certificates/${certificateB._id}`, {}],
  ['get', () => `/api/certificates/${certificateB._id}/download`, {}],
  ['get', () => `/api/certificates/image/${b._id}/${certificateB.certificateCode}.jpg`, {}],
  ['post', () => `/api/certificates/${certificateB._id}/regenerate`, {}],
  ['post', () => `/api/certificates/${certificateB._id}/send-email`, {}],
  ['post', () => `/api/certificates/${certificateB._id}/shares`, {}],
  ['get', () => `/api/certificates/${certificateB._id}/shares`, {}],
  ['delete', () => `/api/certificates/${certificateB._id}/shares/${shareB._id}`, {}],
  ['post', () => `/api/certificates/${certificateB._id}/lifecycle`, { action: 'revoke', reason: 'forged' }],
  ['get', () => '/api/admin/activities', {}],
  ['get', () => '/api/admin/stats', {}]
])('Institute A cannot %s Institute B resource %p', async (method, url, body) => {
  const res = await api(method, url(), { ...body, instituteId: b._id });
  expect([403, 404]).toContain(res.status);
  expect((await Student.findById(studentB._id)).email).toBe('student@example.com');
  expect((await Certificate.findById(certificateB._id)).status).toBe('issued');
});

test('teacher management is institute-scoped', async () => {
  const foreign = await User.collection.insertOne({ userType: 'teacher', instituteId: b._id, email: 'foreign@example.com' });
  for (const method of ['get', 'put', 'delete']) {
    expect((await api(method, `/api/teachers/${foreign.insertedId}`, { firstName: 'forged' })).status).toBe(404);
  }
});

test('foreign template asset paths are rejected before save', async () => {
  const res = await api('put', `/api/certificate-templates/${templateA._id}/fields`, {
    imageFields: [{ imagePath: `uploads/template-assets/${b._id}/seal.png`, x: 0, y: 0, width: 100, height: 100 }]
  });
  expect(res.status).toBe(403);
  expect((await Template.findById(templateA._id)).imageFields).toHaveLength(0);
});

test('lists, exports, analytics and issuance history ignore a forged institute', async () => {
  await VerificationLog.collection.insertOne({ institute: b._id, certificate: certificateB._id, riskScore: 90 });
  await Event.collection.insertOne({ instituteId: b._id, event: 'consumed', units: 1 });
  for (const route of ['/api/students', '/api/courses', '/api/certificate-templates', '/api/teachers', '/api/certificates', '/api/certificates/security/analytics', '/api/certificates/issuance/history', '/api/students/export']) {
    const res = await api('get', `${route}?instituteId=${b._id}`);
    expect(res.status).toBe(200);
    expect(res.text).not.toContain(String(studentB._id));
    expect(res.text).not.toContain('Student B');
    expect(res.text).not.toContain('B Course');
    expect(res.text).not.toContain('B template');
  }
});

test('forged ownership and dotted reference updates cannot move records', async () => {
  const res = await api('put', `/api/students/${studentA._id}`, { name: 'Allowed', instituteId: b._id, 'courseId._id': courseB._id });
  expect(res.status).toBe(200);
  const student = await Student.findById(studentA._id);
  expect(String(student.instituteId)).toBe(String(a._id));
  expect(String(student.courseId)).toBe(String(courseA._id));
});

test.each(['studentId', 'courseId', 'templateId'])('issuance rejects foreign %s for institutes and teachers', async field => {
  const foreign = { studentId: studentB._id, courseId: courseB._id, templateId: templateB._id };
  for (const [route, auth] of [['/api/certificates', token], ['/api/teachers/certificates/issue', teacherToken]]) {
    const res = await api('post', route, payload({ [field]: String(foreign[field]), instituteId: b._id }), auth);
    expect([403, 404]).toContain(res.status);
  }
  expect(await Operation.countDocuments()).toBe(0);
});

test('normal issuance signs, renders, completes enrollment and appends a permanent ledger', async () => {
  const { certificate } = await issue();
  expect(certificate.status).toBe('issued');
  expect(certificate.credential.signature).toBeTruthy();
  expect((await fs.stat(certificate.generatedCertificateImage)).size).toBeGreaterThan(0);
  expect((await Student.findById(studentA._id)).status).toBe('completed');
  expect(await Event.find().distinct('event')).toEqual(expect.arrayContaining(['reserved', 'consumed']));
  expect(await Lock.countDocuments()).toBe(0);
  const replay = await issue();
  expect(replay.replayed).toBe(true);
  expect(String(replay.certificate._id)).toBe(String(certificate._id));
  expect(email.sendCertificateEmail).toHaveBeenCalledTimes(1);
  expect(await Event.countDocuments({ event: 'consumed' })).toBe(1);
});

test('the same idempotency key cannot issue changed details', async () => {
  await issue();
  await expect(issue({ input: payload({ awardDate: '2026-09-02' }) })).rejects.toMatchObject({ status: 409 });
});

test.each([true, false])('simultaneous requests with same key=%s consume exactly once', async sameKey => {
  const results = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => issue({ idempotencyKey: sameKey ? 'concurrency-key-same' : `concurrency-key-${i}` })));
  expect(results.filter(r => r.status === 'fulfilled').length).toBeGreaterThanOrEqual(1);
  for (const result of results.filter(r => r.status === 'rejected')) expect(result.reason.status).toBe(409);
  expect(await Certificate.countDocuments({ instituteId: a._id })).toBe(1);
  expect(await Event.countDocuments({ instituteId: a._id, event: 'consumed' })).toBe(1);
});

test('render failures release the reservation and the same request can retry', async () => {
  const spy = jest.spyOn(rendering, 'generateCertificateImage').mockRejectedValueOnce(new Error('render failure'));
  await expect(issue()).rejects.toThrow('render failure');
  expect(await Certificate.countDocuments({ instituteId: a._id })).toBe(0);
  expect((await Student.findById(studentA._id)).status).toBe('active');
  expect(await Event.countDocuments({ event: 'released' })).toBe(1);
  expect(await Lock.countDocuments()).toBe(0);
  expect(await fs.readdir(path.join(uploadRoot, 'qrcodes', String(a._id)))).toHaveLength(0);
  spy.mockRestore();
  await issue();
  expect(await Event.countDocuments({ event: 'consumed' })).toBe(1);
});

test('database failure rolls back certificate, student and consumption together', async () => {
  const original = Event.create.bind(Event);
  jest.spyOn(Event, 'create').mockImplementation((docs, options) => {
    if (docs[0].event === 'consumed') throw new Error('ledger storage failure');
    return original(docs, options);
  });
  await expect(issue()).rejects.toThrow('ledger storage failure');
  expect(await Certificate.countDocuments({ instituteId: a._id })).toBe(0);
  expect((await Student.findById(studentA._id)).status).toBe('active');
  expect(await Event.countDocuments({ event: 'consumed' })).toBe(0);
  expect(await Lock.countDocuments()).toBe(0);
});

test('an expired worker is fenced off when its reservation is recovered', async () => {
  const original = rendering.generateCertificateImage;
  let resume, ready;
  const paused = new Promise(resolve => { resume = resolve; });
  const renderingStarted = new Promise(resolve => { ready = resolve; });
  jest.spyOn(rendering, 'generateCertificateImage').mockImplementationOnce(async data => {
    const image = await original(data); ready(); await paused; return image;
  });
  const first = issue();
  await renderingStarted;
  await Lock.updateMany({}, { $set: { leaseUntil: new Date(0) } });
  await Operation.updateMany({}, { $set: { leaseUntil: new Date(0) } });
  const recovered = await issue();
  resume();
  const stale = await first;
  expect(String(stale.certificate._id)).toBe(String(recovered.certificate._id));
  expect(await Certificate.countDocuments({ instituteId: a._id })).toBe(1);
  expect(await Event.countDocuments({ event: 'consumed' })).toBe(1);
  expect(await Event.countDocuments({ event: 'released' })).toBe(1);
  expect(await fs.readdir(path.join(uploadRoot, 'generated', String(a._id)))).toHaveLength(1);
});

test('concurrent first issuance uses one institute signing key', async () => {
  const secondStudent = await Student.create({ instituteId: a._id, courseId: courseA._id, name: 'Second', email: 'second@example.com' });
  const results = await Promise.all([issue(), issue({ input: payload({ studentId: String(secondStudent._id) }), idempotencyKey: 'second-student-key' })]);
  const owner = await User.findById(a._id);
  for (const result of results) expect(result.certificate.credential.keyId).toBe(owner.credentialSigning.keyId);
});

test('email delivery failure never rolls back an issued certificate or consumes twice', async () => {
  email.sendCertificateEmail.mockRejectedValueOnce(new Error('SMTP unavailable'));
  await issue(); await issue();
  expect(await Event.countDocuments({ event: 'consumed' })).toBe(1);
  expect(await Certificate.countDocuments({ instituteId: a._id, status: 'issued' })).toBe(1);
});

test('bulk retries return the same certificates and ledger', async () => {
  const body = { certificates: [{ studentEmail: studentA.email, courseCode: courseA.courseCode, templateId: String(templateA._id), awardDate: '2026-09-01' }] };
  const send = () => api('post', '/api/certificates/bulk-issue', body).set('Idempotency-Key', 'bulk-request-test-001');
  const first = await send(); const second = await send();
  expect(first.body.data.failed).toEqual([]);
  expect(second.body.data.successful[0].replayed).toBe(true);
  expect(second.body.data.successful[0].certificateCode).toBe(first.body.data.successful[0].certificateCode);
  expect(await Event.countDocuments({ event: 'consumed' })).toBe(1);
});

test('teacher issuance uses the same ledger and records the teacher actor', async () => {
  const res = await api('post', '/api/teachers/certificates/issue', payload(), teacherToken);
  expect(res.status).toBe(201);
  expect(res.body.data.lifecycleEvents[0].performedBy).toBe(String(teacher._id));
  expect(String((await Event.findOne({ event: 'consumed' })).actorId)).toBe(String(teacher._id));
});

test('legacy draft status and regeneration both go through shared issuance', async () => {
  const draft = await Certificate.create({ instituteId: a._id, studentId: studentA._id, courseId: courseA._id, templateId: templateA._id,
    certificateCode: 'AAA-260901-ABCDEFGHJK', studentName: studentA.name, courseName: courseA.courseName, awardDate: new Date('2026-09-01'), status: 'draft', approvalRequired: true });
  const res = await api('put', `/api/certificates/${draft._id}/status`, { status: 'issued' });
  expect(res.status).toBe(200);
  expect((await Certificate.findById(draft._id)).status).toBe('issued');
  expect(await Event.countDocuments({ event: 'consumed' })).toBe(1);
  expect((await api('post', `/api/certificates/${draft._id}/regenerate`)).status).toBe(200);
  expect(await Event.countDocuments({ event: 'consumed' })).toBe(1);
});

test('global account email uniqueness is enforced by the database across institutes', async () => {
  await expect(User.collection.insertOne({ email: a.email, userType: 'teacher', instituteId: b._id })).rejects.toMatchObject({ code: 11000 });
});
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

async function fixtureFile() {
  const code = 'AAA-260929-ABCDEFGHJK';
  const relative = `uploads/generated/${a._id}/${code}.jpg`;
  const qr = `uploads/qrcodes/${a._id}/${code}.png`;
  await sharp({ create: { width: 32, height: 32, channels: 3, background: '#fff' } }).jpeg().toFile(path.join(uploadRoot, 'generated', String(a._id), `${code}.jpg`));
  await fs.copyFile(path.join(uploadRoot, 'templates', String(a._id), 'test.png'), path.join(uploadRoot, 'qrcodes', String(a._id), `${code}.png`));
  return Certificate.create({ instituteId: a._id, studentId: studentA._id, courseId: courseA._id, templateId: templateA._id,
    certificateCode: code, studentName: studentA.name, courseName: courseA.courseName, awardDate: new Date(), status: 'issued',
    generatedCertificateImage: relative, qrCodeImage: qr });
}
async function fixtureShare(fields = ['certificateImage', 'studentName']) {
  const certificate = await fixtureFile();
  const raw = crypto.randomBytes(32).toString('base64url');
  const share = await Share.create({ institute: a._id, certificate: certificate._id, createdBy: a._id,
    tokenHash: crypto.createHash('sha256').update(raw).digest('hex'), visibleFields: fields,
    expiresAt: new Date(Date.now() + 3600000), maxViews: 1 });
  return { certificate, share, url: `/api/certificates/verify/share/${raw}` };
}
const localUrl = url => { const parsed = new URL(url); return parsed.pathname + parsed.search; };

test('raw files are inaccessible even when they exist; authenticated file access is scoped and uncached', async () => {
  const certificate = await fixtureFile();
  for (const raw of [certificate.generatedCertificateImage, certificate.qrCodeImage, templateA.templateImage]) {
    expect((await request(app).get(`/${raw}`)).status).toBe(404);
  }
  for (const kind of ['image', 'qr', 'download']) {
    const url = `/api/private-files/certificates/${certificate.certificateCode}/${kind}`;
    expect((await request(app).get(url)).status).toBe(401);
    expect((await api('get', url, {}, signAccessToken(b))).status).toBe(404);
    const allowed = await api('get', url);
    expect(allowed.status).toBe(200);
    expect(allowed.headers['cache-control']).toBe('private, no-store');
    expect(allowed.headers['referrer-policy']).toBe('no-referrer');
    expect(allowed.headers.etag).toBeUndefined();
    if (kind === 'download') expect(allowed.headers['content-disposition']).toContain('attachment');
    expect((await api('get', url, {}, teacherToken)).status).toBe(200);
  }
  await User.updateOne({ _id: teacher._id }, { $set: { assignedCourses: [] } });
  expect((await api('get', `/api/private-files/certificates/${certificate.certificateCode}/image`, {}, teacherToken)).status).toBe(404);
});

test('private template backgrounds and assets enforce institute and teacher course scope', async () => {
  const asset = `uploads/template-assets/${a._id}/signature.png`;
  await fs.copyFile(path.join(uploadRoot, 'templates', String(a._id), 'test.png'), path.resolve(__dirname, '../../Backend', asset));
  await Template.updateOne({ _id: templateA._id }, { $set: { imageFields: [{ imagePath: asset, imageType: 'signature' }] } });
  for (const kind of ['background', '0']) {
    const url = `/api/private-files/templates/${templateA._id}/${kind}`;
    expect((await request(app).get(url)).status).toBe(401);
    expect((await api('get', url, {}, signAccessToken(b))).status).toBe(404);
    expect((await api('get', url)).status).toBe(200);
    expect((await api('get', url, {}, teacherToken)).status).toBe(200);
  }
  await Template.updateOne({ _id: templateA._id }, { $set: { templateImage: templateB.templateImage } });
  expect((await api('get', `/api/private-files/templates/${templateA._id}/background`)).status).toBe(403);
});

test('public verification discloses status but no file URLs, paths, lifecycle details or compact payload', async () => {
  const certificate = await fixtureFile();
  const result = await request(app).get(`/api/certificates/verify/${certificate.certificateCode}`);
  expect(result.status).toBe(200);
  expect(result.body.data.status).toBe('issued');
  expect(JSON.stringify(result.body)).not.toMatch(/uploads|private-files|compactToken|lifecycleEvents|certificateImage|qrCodeImage/);
});

test('the last allowed share view grants bounded file access without spending a second view', async () => {
  const { share, url } = await fixtureShare();
  const result = await request(app).get(url);
  expect(result.status).toBe(200);
  expect(result.body.data.disclosure.remainingViews).toBe(0);
  const imageUrl = localUrl(result.body.data.certificateImage);
  expect((await request(app).get(imageUrl)).status).toBe(200);
  expect((await request(app).get(`${imageUrl}&download=1`)).headers['content-disposition']).toContain('attachment');
  expect((await request(app).get(url)).status).toBe(410);
  expect((await Share.findById(share._id)).viewCount).toBe(1);
  await Share.updateOne({ _id: share._id }, { $set: { revokedAt: new Date() } });
  expect((await request(app).get(imageUrl)).status).toBe(410);
});

test.each(['expired-share', 'hidden-image', 'revoked-certificate', 'expired-certificate', 'foreign-institute'])('existing file grants reject %s immediately', async condition => {
  const { share, certificate, url } = await fixtureShare();
  const resolved = await request(app).get(url);
  const imageUrl = localUrl(resolved.body.data.certificateImage);
  if (condition === 'expired-share') await Share.updateOne({ _id: share._id }, { $set: { expiresAt: new Date(0) } });
  if (condition === 'hidden-image') await Share.updateOne({ _id: share._id }, { $set: { visibleFields: ['studentName'] } });
  if (condition === 'revoked-certificate') await Certificate.updateOne({ _id: certificate._id }, { $set: { status: 'revoked' } });
  if (condition === 'expired-certificate') await Certificate.updateOne({ _id: certificate._id }, { $set: { validUntil: new Date(0) } });
  if (condition === 'foreign-institute') await Share.updateOne({ _id: share._id }, { $set: { institute: b._id } });
  expect((await request(app).get(imageUrl)).status).toBe(410);
});

test('restricted shares disclose no image and file endpoints reject login tokens and expired grants', async () => {
  const { url, share, certificate } = await fixtureShare(['studentName']);
  const result = await request(app).get(url);
  expect(result.body.data.certificateImage).toBeUndefined();
  expect((await request(app).get(`/api/private-files/share?grant=${token}`)).status).toBe(410);
  const expired = jwt.sign({ shareId: String(share._id), certificateId: String(certificate._id) }, process.env.JWT_SECRET,
    { audience: 'credential-file', issuer: 'certverify', expiresIn: -1 });
  expect((await request(app).get(`/api/private-files/share?grant=${expired}`)).status).toBe(410);
});

test('concurrent resolution cannot exceed the share view limit', async () => {
  const { url } = await fixtureShare();
  const results = await Promise.all(Array.from({ length: 8 }, () => request(app).get(url)));
  expect(results.filter(r => r.status === 200)).toHaveLength(1);
  expect(results.filter(r => r.status === 410)).toHaveLength(7);
});

test('certificate delivery email contains an expiring controlled link, never a static file URL', async () => {
  const { certificate } = await issue();
  const delivered = email.sendCertificateEmail.mock.calls[0][0];
  expect(delivered.certificateUrl).toMatch(/\/share\/[A-Za-z0-9_-]{43}$/);
  expect(delivered.downloadUrl).toBe(delivered.certificateUrl);
  const shares = await Share.find({ certificate: certificate._id });
  expect(shares).toHaveLength(1);
  expect(shares[0].visibleFields).toContain('certificateImage');
  expect(shares[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
});

async function templateUpload(buffer, name = 'template.png', contentType = 'image/png', asset) {
  let req = request(app).post('/api/certificate-templates').set('Authorization', `Bearer ${token}`)
    .field('courseId', String(courseA._id)).field('templateName', 'Uploaded')
    .attach('templateImage', buffer, { filename: name, contentType });
  if (asset) req = req.attach('assetImages', asset, { filename: 'asset.png', contentType: 'image/png' });
  return req;
}
const pngBytes = () => sharp({ create: { width: 32, height: 32, channels: 3, background: '#fff' } }).png().toBuffer();

test.each(['spoofed', 'wrong-encoding', 'oversized-dimensions', 'unsupported-extension', 'oversized-file', 'bad-asset'])('template upload rejects %s and cleans partial files', async scenario => {
  let bytes = await pngBytes(); let name = 'template.png'; let asset;
  if (scenario === 'spoofed') bytes = Buffer.from('<script>alert(1)</script>');
  if (scenario === 'wrong-encoding') bytes = await sharp(bytes).jpeg().toBuffer();
  if (scenario === 'oversized-dimensions') bytes = await sharp({ create: { width: 8001, height: 1, channels: 3, background: '#fff' } }).png().toBuffer();
  if (scenario === 'unsupported-extension') name = 'payload.png.exe';
  if (scenario === 'oversized-file') bytes = Buffer.alloc(11 * 1024 * 1024);
  if (scenario === 'bad-asset') asset = Buffer.from('not an image');
  const result = await templateUpload(bytes, name, 'image/png', asset);
  expect(result.status).toBe(400);
  expect(await fs.readdir(path.join(uploadRoot, 'templates', String(a._id)))).toEqual(['test.png']);
  expect(await fs.readdir(path.join(uploadRoot, 'template-assets', String(a._id)))).toEqual([]);
});

test('valid template upload is reencoded, uses generated filenames and private URLs', async () => {
  const result = await templateUpload(await pngBytes(), '../../untrusted.png');
  expect(result.status).toBe(201);
  expect(result.body.data.templateImage).toMatch(/^uploads\/templates\/[a-f\d]{24}\/template-[\d-]+\.png$/);
  expect(result.body.data.templateImageUrl).toContain('/api/private-files/templates/');
  expect((await api('get', localUrl(result.body.data.templateImageUrl))).status).toBe(200);
});

test.each(['spoofed', 'wrong-encoding', 'wrong-extension', 'too-large'])('logo upload rejects %s', async scenario => {
  let bytes = await pngBytes(); let name = 'logo.png';
  if (scenario === 'spoofed') bytes = Buffer.from('not an image');
  if (scenario === 'wrong-encoding') bytes = await sharp(bytes).jpeg().toBuffer();
  if (scenario === 'wrong-extension') name = 'logo.pngfoo';
  if (scenario === 'too-large') bytes = Buffer.alloc(3 * 1024 * 1024);
  const result = await request(app).post('/api/institute/logo').set('Authorization', `Bearer ${token}`).attach('logo', bytes, { filename: name, contentType: 'image/png' });
  expect(result.status).toBe(400);
  expect(await fs.readdir(path.join(uploadRoot, 'logos', String(a._id)))).toEqual([]);
});
const { validateTransactions } = require('../../Backend/scripts/validateStagingTransactions');
const subscriptions = require('../../Backend/services/subscriptionService');
const { Plan, Subscription, UsageTransaction, Payment, SubscriptionEvent } = require('../../Backend/models/Saas');

describe('Manual receipt submission and review', () => {
  let pending, reviewer, reviewerToken;
  beforeEach(async () => {
    process.env.SAAS_ENABLED = 'true';
    process.env.PAYMENT_BANK_NAME = 'Test Bank'; process.env.PAYMENT_ACCOUNT_HOLDER = 'Test Holder';
    process.env.PAYMENT_ACCOUNT_NUMBER = '123456'; process.env.PAYMENT_BANK_BRANCH = 'Test Branch';
    reviewer = { _id: id(), userType: 'superadmin', email: 'receipt-reviewer@example.com', isActive: true };
    await User.collection.insertOne(reviewer); reviewerToken = signAccessToken(reviewer);
    const plan = await Plan.create({ name: 'Receipt package', priceMinor: 1490000, active: true, limits: { certificates: 100, teachers: 2, templates: 2 } });
    pending = await subscriptions.requestSubscription(a._id, plan._id, 'request-receipt-test');
  });
  afterEach(() => {
    process.env.SAAS_ENABLED = 'false';
    for (const key of ['PAYMENT_BANK_NAME', 'PAYMENT_ACCOUNT_HOLDER', 'PAYMENT_ACCOUNT_NUMBER', 'PAYMENT_BANK_BRANCH']) delete process.env[key];
  });
  const upload = async (subId, bytes, auth = token) => request(app).post(`/api/subscriptions/${subId}/payment-proof`)
    .set('Authorization', `Bearer ${auth}`).field('transactionNumber', 'BANK-RECEIPT-123').field('payerName', 'Test Payer').field('paidAt', '2026-01-01').field('notes', 'Annual package')
    .attach('receipt', bytes, { filename: 'receipt.png', contentType: 'image/png' });
  test('only super admins can update durable bank instructions, and every change is audited', async () => {
    const url = '/api/subscriptions/admin/bank-details';
    const bank = { bankName: 'New Bank', accountHolder: 'New Holder', accountNumber: '00123456', branch: 'Main' };
    expect((await request(app).put(url).send(bank)).status).toBe(401);
    expect((await api('put', url, bank)).status).toBe(403);
    expect((await api('get', url)).status).toBe(403);
    expect((await api('put', url, { ...bank, branch: '' }, reviewerToken)).status).toBe(400);
    expect((await api('put', url, { ...bank, extra: true }, reviewerToken)).status).toBe(400);
    expect((await api('put', url, bank, reviewerToken)).status).toBe(200);
    expect((await api('get', '/api/subscriptions/bank-details')).body.data).toMatchObject(bank);
    expect((await api('put', url, { ...bank, accountNumber: '00987654' }, reviewerToken)).status).toBe(200);
    expect((await api('get', '/api/subscriptions/bank-details')).body.data.accountNumber).toBe('00987654');
    expect(await SubscriptionEvent.countDocuments({ event: 'payment_bank_details_updated', actorId: reviewer._id })).toBe(2);
    expect((await Subscription.findById(pending._id)).status).toBe('pending');
  });
  test('proof stays pending, is tenant-private, and requires current receipt approval before allocating credits', async () => {
    expect((await api('post', `/api/subscriptions/admin/subscriptions/${pending._id}/activate`, { reference: 'BANK-RECEIPT-123', amountMinor: 1490000 }, reviewerToken)).status).toBe(409);
    expect((await upload(pending._id, await pngBytes())).status).toBe(200);
    let saved = await Subscription.findById(pending._id);
    expect(saved.status).toBe('pending'); expect(saved.allocated).toBe(0);
    expect(saved.paymentProof.packageReference).toBe('Receipt package');
    expect(saved.paymentProof.receipt).toBeUndefined();
    expect((await api('get', `/api/subscriptions/${pending._id}/receipt`)).status).toBe(200);
    expect((await api('get', `/api/subscriptions/${pending._id}/receipt`, {}, signAccessToken(b))).status).toBe(404);
    expect((await api('get', `/api/subscriptions/${pending._id}/receipt`, {}, reviewerToken)).headers['cache-control']).toBe('private, no-store');
    const body = { reference: 'BANK-RECEIPT-123', amountMinor: 1490000, receiptVersion: saved.paymentProof.receiptVersion };
    expect((await api('post', `/api/subscriptions/admin/subscriptions/${pending._id}/activate`, body)).status).toBe(403);
    expect((await api('post', `/api/subscriptions/admin/subscriptions/${pending._id}/activate`, { ...body, receiptVersion: 'stale' }, reviewerToken)).status).toBe(409);
    expect((await api('post', `/api/subscriptions/admin/subscriptions/${pending._id}/activate`, body, reviewerToken)).status).toBe(200);
    saved = await Subscription.findById(pending._id);
    expect(saved.status).toBe('active'); expect(saved.allocated).toBe(100); expect(saved.paymentProof.status).toBe('approved');
    expect(await Payment.countDocuments({ subscriptionId: pending._id })).toBe(1);
  });
  test('rejects spoofed images and cross-tenant uploads; permits corrected receipt after rejection', async () => {
    expect((await upload(pending._id, Buffer.from('not a PNG'))).status).toBe(400);
    expect((await upload(pending._id, await pngBytes(), signAccessToken(b))).status).toBe(404);
    expect((await upload(pending._id, await pngBytes())).status).toBe(200);
    const before = await Subscription.findById(pending._id);
    expect((await upload(pending._id, await pngBytes())).status).toBe(409);
    expect((await api('post', `/api/subscriptions/admin/subscriptions/${pending._id}/reject-receipt`, { reason: 'Amount is not visible', receiptVersion: before.paymentProof.receiptVersion }, reviewerToken)).status).toBe(200);
    expect((await upload(pending._id, await pngBytes())).status).toBe(200);
    const after = await Subscription.findById(pending._id);
    expect(after.paymentProof.receiptVersion).not.toBe(before.paymentProof.receiptVersion);
    expect(after.status).toBe('pending');
  });
});

describe('Manual SaaS subscriptions and real certificate issuance', () => {
  let plan, subscription, admin, adminToken;
  beforeEach(async () => {
    process.env.SAAS_ENABLED = 'true';
    admin = { _id: id(), userType: 'superadmin', email: 'admin-saas@example.com', isActive: true };
    await User.collection.insertOne(admin); adminToken = signAccessToken(admin);
    plan = await Plan.create({ name: 'Test annual plan', priceMinor: 1490000, active: true,
      limits: { certificates: 1, teachers: 2, templates: 2 }, features: { bulkCertificateIssue: true, secureSharing: true } });
    subscription = await subscriptions.requestSubscription(a._id, plan._id, 'request-subscription-a');
    await Subscription.updateOne({ _id: subscription._id }, { $set: { paymentProof: { transactionNumber: 'BANK-A', packageReference: plan.name, status: 'submitted', receiptVersion: 'fixture-a' } } });
    subscription = await subscriptions.activateManual(subscription._id, admin._id, { reference: 'BANK-A', amountMinor: 1490000, receiptVersion: 'fixture-a' });
  });
  afterEach(() => { process.env.SAAS_ENABLED = 'false'; });

  test('manual payment rejects incorrect amounts and activates exactly once under retries', async () => {
    const pending = await subscriptions.requestSubscription(b._id, plan._id, 'request-subscription-b');
    expect((await api('post', `/api/subscriptions/admin/subscriptions/${pending._id}/activate`, { reference: 'BANK-B', amountMinor: 1 }, adminToken)).status).toBe(400);
    expect(await Payment.countDocuments({ subscriptionId: pending._id })).toBe(0);
    await Subscription.updateOne({ _id: pending._id }, { $set: { paymentProof: { transactionNumber: 'BANK-B', packageReference: plan.name, status: 'submitted', receiptVersion: 'fixture-b' } } });
    const results = await Promise.allSettled([1, 2].map(() => subscriptions.activateManual(pending._id, admin._id, { reference: 'BANK-B', amountMinor: 1490000, receiptVersion: 'fixture-b' })));
    expect(results.some(result => result.status === 'fulfilled')).toBe(true);
    await subscriptions.activateManual(pending._id, admin._id, { reference: 'BANK-B', amountMinor: 1490000, receiptVersion: 'fixture-b' });
    expect(await Payment.countDocuments({ subscriptionId: pending._id })).toBe(1);
    expect(await UsageTransaction.countDocuments({ subscriptionId: pending._id, event: 'credit_allocated' })).toBe(1);
    expect(await SubscriptionEvent.countDocuments({ subscriptionId: pending._id, event: 'manual_payment_activated' })).toBe(1);
  });
  test('bank references cannot activate two different subscriptions', async () => {
    const pending = await subscriptions.requestSubscription(b._id, plan._id, 'request-subscription-b');
    await expect(subscriptions.activateManual(pending._id, admin._id, { reference: 'bank-a', amountMinor: 1490000 })).rejects.toBeDefined();
    expect((await Subscription.findById(pending._id)).status).toBe('pending');
    expect(await UsageTransaction.countDocuments({ subscriptionId: pending._id })).toBe(0);
  });
  test('plan changes preserve purchased prices and limits', async () => {
    await Plan.updateOne({ _id: plan._id }, { $set: { priceMinor: 999999, 'limits.certificates': 999 } });
    const saved = await Subscription.findById(subscription._id);
    expect(saved.snapshot.priceMinor).toBe(1490000); expect(saved.snapshot.limits.certificates).toBe(1);
  });
  test('concurrent distinct issuance cannot overspend the final credit', async () => {
    const second = await Student.create({ instituteId: a._id, courseId: courseA._id, name: 'Second', email: 'second@example.com' });
    const results = await Promise.allSettled([issue(), issue({ input: payload({ studentId: String(second._id) }), idempotencyKey: 'another-request-key-2' })]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const saved = await Subscription.findById(subscription._id);
    expect(saved.consumed).toBe(1); expect(saved.reserved).toBe(0);
    expect(await Certificate.countDocuments({ instituteId: a._id })).toBe(1);
    expect(await UsageTransaction.countDocuments({ subscriptionId: saved._id, event: 'credit_consumed' })).toBe(1);
  });
  test('idempotent issuance retry does not consume another credit, even after expiry', async () => {
    const first = await issue(); await Subscription.updateOne({ _id: subscription._id }, { $set: { endsAt: new Date(0) } });
    const replay = await issue(); expect(replay.replayed).toBe(true); expect(String(replay.certificate._id)).toBe(String(first.certificate._id));
    expect((await Subscription.findById(subscription._id)).consumed).toBe(1);
    const verify = await request(app).get(`/api/certificates/verify/${first.certificate.certificateCode}`);
    expect(verify.status).toBe(200);
  });
  test('failed rendering releases its credit and a retry can use it', async () => {
    jest.spyOn(rendering, 'generateCertificateImage').mockRejectedValueOnce(new Error('render failed'));
    await expect(issue()).rejects.toThrow('render failed');
    expect((await Subscription.findById(subscription._id)).reserved).toBe(0);
    await issue(); expect((await Subscription.findById(subscription._id)).consumed).toBe(1);
    expect(await UsageTransaction.countDocuments({ subscriptionId: subscription._id, event: 'credit_released' })).toBe(1);
  });
  test('expiry during rendering rolls back certificate completion and releases its credit', async () => {
    const original = rendering.generateCertificateImage;
    jest.spyOn(rendering, 'generateCertificateImage').mockImplementationOnce(async data => {
      const file = await original(data);
      await Subscription.updateOne({ _id: subscription._id }, { $set: { endsAt: new Date(0) } }); return file;
    });
    await expect(issue()).rejects.toMatchObject({ status: 402 });
    expect(await Certificate.countDocuments({ instituteId: a._id })).toBe(0);
    const saved = await Subscription.findById(subscription._id); expect(saved.reserved).toBe(0); expect(saved.consumed).toBe(0);
  });
  test('expired abandoned reservations are recovered before a new issuance', async () => {
    await subscriptions.transaction(async session => {
      const op = new Operation({ instituteId: a._id, actorId: a._id, studentId: studentA._id, courseId: courseA._id,
        key: 'abandoned-request-key', fingerprint: 'abandoned', state: 'reserved', attempt: 1, awardDate: new Date(), leaseUntil: new Date(0) });
      await subscriptions.reserveCredit(op, session); await op.save({ session });
    });
    await issue(); const saved = await Subscription.findById(subscription._id);
    expect(saved.reserved).toBe(0); expect(saved.consumed).toBe(1);
    expect(await UsageTransaction.countDocuments({ subscriptionId: subscription._id, event: 'credit_released' })).toBe(1);
  });
  test('teacher issuance uses the same credit limit', async () => {
    await issue({ actorId: teacher._id });
    expect((await Subscription.findById(subscription._id)).consumed).toBe(1);
  });
  test('template creation is serialized at the purchased limit', async () => {
    const create = suffix => subscriptions.saveLimitedResource(new Template({ instituteId: a._id, courseId: courseA._id,
      templateName: `Extra ${suffix}`, templateImage: templateA.templateImage }), 'templates');
    const results = await Promise.allSettled([create('one'), create('two')]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(await Template.countDocuments({ instituteId: a._id })).toBe(2);
  });
  test('concurrent teacher creation respects its limit and preserves a working password', async () => {
    const data = suffix => ({ firstName: 'Test', lastName: suffix, email: `${suffix}@example.com`, password: 'ValidPassword123', employeeId: suffix,
      department: 'Testing', assignedCourses: [String(courseA._id)] });
    const responses = await Promise.all(['new-one', 'new-two'].map(suffix => api('post', '/api/teachers', data(suffix))));
    expect(responses.filter(response => response.status === 201)).toHaveLength(1);
    expect(responses.filter(response => response.status === 402)).toHaveLength(1);
    expect(await User.countDocuments({ instituteId: a._id, userType: 'teacher' })).toBe(2);
    const created = await User.findById(responses.find(response => response.status === 201).body.data.id).select('+password');
    expect(await require('bcryptjs').compare('ValidPassword123', created.password)).toBe(true);
  });
  test('bulk issuance stops at quota and feature restrictions reject the entire batch', async () => {
    const second = await Student.create({ instituteId: a._id, courseId: courseA._id, name: 'Second', email: 'second@example.com' });
    const certificates = [studentA, second].map(student => ({ studentEmail: student.email, courseCode: courseA.courseCode, templateId: String(templateA._id), awardDate: '2026-09-01' }));
    const result = await api('post', '/api/certificates/bulk-issue', { certificates });
    expect(result.status).toBe(200); expect(result.body.data.successful).toHaveLength(1); expect(result.body.data.failed).toHaveLength(1);
    expect(result.body.data.failed[0].status).toBe(402);
    expect((await Subscription.findById(subscription._id)).consumed).toBe(1);
    // A separately purchased feature-restricted snapshot; raw insert/update is test fixture setup only.
    await Subscription.collection.updateOne({ _id: subscription._id }, { $set: { 'snapshot.features.bulkCertificateIssue': false } });
    expect((await api('post', '/api/certificates/bulk-issue', { certificates })).status).toBe(403);
  });
  test('legacy draft issuance also consumes exactly one credit', async () => {
    const draft = await Certificate.create({ instituteId: a._id, studentId: studentA._id, courseId: courseA._id, templateId: templateA._id,
      certificateCode: 'LEGACY-SAAS-DRAFT', studentName: studentA.name, courseName: courseA.courseName, awardDate: new Date(), status: 'draft' });
    const result = await issue({ legacyCertificateId: draft._id });
    expect(String(result.certificate._id)).toBe(String(draft._id));
    expect((await Subscription.findById(subscription._id)).consumed).toBe(1);
  });
  test('admin catalogue initialization and editing are audited while malformed plan data is rejected', async () => {
    await Plan.deleteMany({});
    const result = await api('post', '/api/subscriptions/admin/plans/bootstrap', {}, adminToken);
    expect(result.status).toBe(200); expect(result.body.data.map(plan => plan.priceMinor)).toEqual([1490000, 2990000, 4990000]);
    expect((await api('post', '/api/subscriptions/admin/plans/bootstrap', {}, adminToken)).status).toBe(409);
    const created = result.body.data[0];
    const edit = { name: created.name, priceMinor: 1590000, limits: created.limits, active: false };
    expect((await api('put', `/api/subscriptions/admin/plans/${created._id}`, edit, adminToken)).status).toBe(200);
    expect(await SubscriptionEvent.countDocuments({ event: 'plan_edited', planId: created._id })).toBe(1);
    expect((await api('put', `/api/subscriptions/admin/plans/${created._id}`, { ...edit, priceMinor: -1 }, adminToken)).status).toBe(400);
    expect((await Subscription.findById(subscription._id)).snapshot.priceMinor).toBe(1490000);
  });
  test('institutes and teachers cannot administer subscriptions or read other institutes', async () => {
    expect((await api('post', `/api/subscriptions/admin/subscriptions/${subscription._id}/activate`, { reference: 'FAKE', amountMinor: 1490000 })).status).toBe(403);
    expect((await api('get', '/api/subscriptions/mine', {}, teacherToken)).status).toBe(403);
    const mine = await api('get', `/api/subscriptions/mine?instituteId=${a._id}`, {}, signAccessToken(b));
    expect(mine.status).toBe(200); expect(mine.body.data.subscriptions).toHaveLength(0); expect(mine.body.data.payments).toHaveLength(0);
  });
  test('suspension prevents issuance and pending activation cannot be bypassed by status changes', async () => {
    await subscriptions.setStatus(subscription._id, admin._id, 'suspended', 'Manual review');
    await expect(issue()).rejects.toMatchObject({ status: 402 });
    await subscriptions.setStatus(subscription._id, admin._id, 'active', 'Review complete'); await issue();
    const pending = await subscriptions.requestSubscription(b._id, plan._id, 'request-subscription-b');
    await expect(subscriptions.setStatus(pending._id, admin._id, 'active', 'Bypass payment')).rejects.toMatchObject({ status: 409 });
  });
  test('renewal creates a new snapshot and leaves the old ledger intact', async () => {
    await issue(); await Subscription.updateOne({ _id: subscription._id }, { $set: { endsAt: new Date(0) } });
    const renewed = await subscriptions.requestSubscription(a._id, plan._id, 'request-renewal-key');
    await Subscription.updateOne({ _id: renewed._id }, { $set: { paymentProof: { transactionNumber: 'BANK-RENEWAL', packageReference: plan.name, status: 'submitted', receiptVersion: 'fixture-renewal' } } });
    await subscriptions.activateManual(renewed._id, admin._id, { reference: 'BANK-RENEWAL', amountMinor: 1490000, receiptVersion: 'fixture-renewal' });
    expect((await Subscription.findById(subscription._id)).status).toBe('expired');
    expect((await Subscription.findById(renewed._id)).consumed).toBe(0);
    expect(await UsageTransaction.countDocuments({ subscriptionId: subscription._id, event: 'credit_consumed' })).toBe(1);
  });
  test('a suspended expired term requires audited admin closure before renewal', async () => {
    await subscriptions.setStatus(subscription._id, admin._id, 'suspended', 'Review account');
    await Subscription.updateOne({ _id: subscription._id }, { $set: { endsAt: new Date(0) } });
    await expect(subscriptions.requestSubscription(a._id, plan._id, 'renew-suspended-term')).rejects.toMatchObject({ status: 409 });
    await subscriptions.setStatus(subscription._id, admin._id, 'expired', 'Account review resolved');
    expect((await subscriptions.requestSubscription(a._id, plan._id, 'renew-suspended-term')).status).toBe('pending');
    expect(await SubscriptionEvent.countDocuments({ subscriptionId: subscription._id, event: 'subscription_expired' })).toBe(1);
  });
});
test('staging transaction probe verifies commit and rollback and removes its temporary collection', async () => {
  expect(await validateTransactions(mongoose.connection)).toEqual({ committed: 1, rolledBack: true });
  const collections = await mongoose.connection.db.listCollections().toArray();
  expect(collections.some(c => c.name.startsWith('_staging_probe_'))).toBe(false);
});

describe('Registration trial and upgrade lifecycle', () => {
  let starter;
  beforeEach(async () => {
    process.env.SAAS_ENABLED = 'true';
    starter = await Plan.create({ name: 'Starter', priceMinor: 1490000, active: true,
      limits: { certificates: 37, teachers: 3, templates: 4 }, features: { bulkCertificateIssue: true, secureSharing: true } });
  });
  afterEach(() => { process.env.SAAS_ENABLED = 'false'; });
  test('registration grants Starter limits for exactly 14 days without restarting on retry', async () => {
    const response = await request(app).post('/api/auth/register').send({ instituteName: 'Trial Institute', email: 'trial@example.com',
      address: 'Colombo', adminName: 'Trial Admin', password: 'TrialPassword123', confirmPassword: 'TrialPassword123', agreeToTerms: true });
    expect(response.status).toBe(201);
    const user = await User.findOne({ email: 'trial@example.com' }).select('+password');
    expect(await require('bcryptjs').compare('TrialPassword123', user.password)).toBe(true);
    const trial = await Subscription.findOne({ instituteId: user._id, activation: 'trial' });
    expect(trial.status).toBe('trial'); expect(trial.allocated).toBe(37);
    expect(trial.snapshot.limits.teachers).toBe(3); expect(trial.snapshot.limits.templates).toBe(4);
    expect(trial.endsAt - trial.startsAt).toBe(14 * 86400000);
    await subscriptions.transaction(session => subscriptions.createRegistrationTrial(user._id, session));
    expect(await Subscription.countDocuments({ instituteId: user._id, activation: 'trial' })).toBe(1);
    expect((await Subscription.findById(trial._id)).endsAt).toEqual(trial.endsAt);
    expect(await Payment.countDocuments({ instituteId: user._id })).toBe(0);
  });
  test('trial remains usable during payment review; approval replaces it with paid credits', async () => {
    const trial = await subscriptions.transaction(session => subscriptions.createRegistrationTrial(a._id, session));
    const pending = await subscriptions.requestSubscription(a._id, starter._id, 'trial-upgrade-request');
    expect(String((await subscriptions.requireActiveSubscription(a._id))._id)).toBe(String(trial._id));
    await issue(); expect((await Subscription.findById(trial._id)).consumed).toBe(1);
    expect((await Subscription.findById(pending._id)).allocated).toBe(0);
    await expect(subscriptions.activateManual(pending._id, b._id, { reference: 'TRIAL-UPGRADE', amountMinor: starter.priceMinor })).rejects.toMatchObject({ status: 409 });
    await Subscription.updateOne({ _id: pending._id }, { $set: { paymentProof: { transactionNumber: 'TRIAL-UPGRADE', status: 'submitted', receiptVersion: 'trial-receipt' } } });
    await subscriptions.activateManual(pending._id, b._id, { reference: 'TRIAL-UPGRADE', amountMinor: starter.priceMinor, receiptVersion: 'trial-receipt' });
    expect((await Subscription.findById(trial._id)).status).toBe('expired');
    expect(String((await subscriptions.requireActiveSubscription(a._id))._id)).toBe(String(pending._id));
    expect((await Subscription.findById(pending._id)).allocated).toBe(37);
    expect(await require('../../Backend/models/Notification').countDocuments({ recipient: a._id, title: 'Payment approved' })).toBe(1);
  });
  test('expired trial blocks issuance but allows selection and cancellation without another free trial', async () => {
    const trial = await subscriptions.transaction(session => subscriptions.createRegistrationTrial(a._id, session));
    await Subscription.updateOne({ _id: trial._id }, { $set: { endsAt: new Date(0) } });
    await expect(issue()).rejects.toMatchObject({ status: 402 });
    const pending = await subscriptions.requestSubscription(a._id, starter._id, 'expired-trial-upgrade');
    expect((await api('post', `/api/subscriptions/${pending._id}/cancel`, {}, signAccessToken(b))).status).toBe(409);
    expect((await api('post', `/api/subscriptions/${pending._id}/cancel`)).status).toBe(200);
    const renewed = await subscriptions.requestSubscription(a._id, starter._id, 'new-package-request');
    expect(renewed.status).toBe('pending');
    await Subscription.updateOne({ _id: renewed._id }, { $set: { paymentProof: { transactionNumber: 'EXPIRED-UPGRADE', status: 'submitted', receiptVersion: 'expired-receipt' } } });
    await subscriptions.activateManual(renewed._id, b._id, { reference: 'EXPIRED-UPGRADE', amountMinor: starter.priceMinor, receiptVersion: 'expired-receipt' });
    expect((await Subscription.findById(trial._id)).endsAt.getTime()).toBe(0);
    expect(await Subscription.countDocuments({ instituteId: a._id, activation: 'trial' })).toBe(1);
  });
});
