jest.mock('../../Backend/utils/emailService', () => ({ sendCertificateEmail: jest.fn(), sendCredentialShareEmail: jest.fn() }));
process.env.NODE_ENV = 'test';
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
    for (const folder of ['templates', 'template-assets', 'generated', 'qrcodes']) {
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
    if (!/^(templates|template-assets|generated|qrcodes)[\\/][a-f\d]{24}$/.test(relative)) throw new Error('Unsafe test cleanup path');
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
