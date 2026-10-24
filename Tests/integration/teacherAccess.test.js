jest.mock('../../Backend/utils/emailService', () => ({ sendTeacherAccessEmail: jest.fn(), sendOtpEmail: jest.fn() }));
process.env.NODE_ENV = 'test';
process.env.SAAS_ENABLED = 'false';
process.env.JWT_SECRET = 'teacher-access-test-only-secret';
process.env.FRONTEND_URL = 'https://certiverxia.example';
process.env.CORS_ALLOWED_ORIGINS = 'https://certiverxia.example';
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const User = require('../../Backend/models/User');
const ActivityLog = require('../../Backend/models/ActivityLog');
const email = require('../../Backend/utils/emailService');
const { signAccessToken } = require('../../Backend/config/jwt');
const { resetRateLimitStores } = require('../../Backend/middleware/rateLimit');
const app = express(); app.use(express.json()); app.use('/teachers', require('../../Backend/routes/teacherRoutes'));
const browserApp = require('../../Backend/app');
let db, institute, other, teacher;
const auth = user => ({ Authorization: `Bearer ${signAccessToken(user)}` });
const tokenFromEmail = () => new URLSearchParams(new URL(email.sendTeacherAccessEmail.mock.calls.at(-1)[0].url).hash.slice(1)).get('token');
beforeAll(async () => {
  db = await MongoMemoryReplSet.create({ binary: { version: '8.0.17' }, replSet: { count: 1, storageEngine: 'wiredTiger' } });
  // NODE-7832: provide os directly because the driver cannot dynamically import it in Jest.
  await mongoose.connect(db.getUri(), { runtimeAdapters: { os: require('node:os') }, dbName: 'teacher_access_tests' });
  for (const model of Object.values(mongoose.models)) await model.init();
}, 300000);
beforeEach(async () => {
  resetRateLimitStores(); jest.resetAllMocks(); email.sendTeacherAccessEmail.mockResolvedValue({ messageId: 'mock-only' });
  for (const model of Object.values(mongoose.models)) await model.deleteMany({});
  institute = { _id: new mongoose.Types.ObjectId(), userType: 'institute', instituteName: 'Example Institute', email: 'admin@example.com', isActive: true, isVerifiedByAdmin: true };
  other = { ...institute, _id: new mongoose.Types.ObjectId(), email: 'other@example.com' };
  await User.collection.insertMany([institute, other]);
  teacher = await User.create({ firstName: 'Test', lastName: 'Teacher', email: 'teacher@example.com', password: 'OriginalPass123', employeeId: 'EMP1', department: 'Design', userType: 'teacher', instituteId: institute._id, isActive: true, isEmailVerified: true, isVerifiedByAdmin: true });
});
afterAll(async () => { await mongoose.disconnect(); await db?.stop(); });

test('creation without an admin-selected password emails a setup link and does not expose secrets', async () => {
  const response = await request(app).post('/teachers').set(auth(institute)).send({ firstName: 'New', lastName: 'Teacher', email: 'new@example.com', department: 'Design', employeeId: 'EMP2' });
  expect(response.status).toBe(201); expect(response.body.invitationEmailSent).toBe(true);
  expect(email.sendTeacherAccessEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'new@example.com', invitation: true }));
  const token = tokenFromEmail(); expect(token).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(response.body)).not.toContain(token); expect(response.body.data.password).toBeUndefined();
  const created = await User.findById(response.body.data.id).select('+teacherPasswordSetup');
  expect(created.teacherPasswordSetup.tokenHash).not.toBe(token);
  const list = await request(app).get('/teachers').set(auth(institute));
  expect(list.body.data.find(row => row._id === String(created._id)).teacherPasswordSetup).toBeUndefined();
});
test('email link is single-use under concurrency and revokes existing sessions', async () => {
  const oldAuth = auth(teacher);
  expect((await request(app).post(`/teachers/${teacher._id}/password-link`).set(auth(institute))).status).toBe(200);
  const token = tokenFromEmail();
  const responses = await Promise.all([1, 2].map(() => request(app).post('/teachers/password-setup').send({ token, newPassword: 'UpdatedPass123' })));
  expect(responses.map(result => result.status).sort()).toEqual([200, 400]);
  const updated = await User.findById(teacher._id).select('+teacherPasswordSetup');
  expect(await updated.comparePassword('UpdatedPass123')).toBe(true);
  expect(updated.teacherPasswordSetup).toBeUndefined();
  expect((await request(app).get('/teachers/profile/me').set(oldAuth)).status).toBe(401);
  expect(await ActivityLog.countDocuments({ action: 'PASSWORD_RESET' })).toBe(1);
});
test('only the owning institute can send links or directly reset passwords', async () => {
  for (const action of ['password-link', 'reset-password']) {
    expect((await request(app).post(`/teachers/${teacher._id}/${action}`).set(auth(other)).send({ newPassword: 'UpdatedPass123' })).status).toBe(404);
    expect((await request(app).post(`/teachers/${teacher._id}/${action}`).set(auth(teacher)).send({ newPassword: 'UpdatedPass123' })).status).toBe(403);
  }
  await request(app).post(`/teachers/${teacher._id}/password-link`).set(auth(institute));
  const token = tokenFromEmail();
  expect((await request(app).post(`/teachers/${teacher._id}/reset-password`).set(auth(institute)).send({ newPassword: 'AdminSetPass123' })).status).toBe(200);
  expect(await (await User.findById(teacher._id)).comparePassword('AdminSetPass123')).toBe(true);
  expect((await request(app).post('/teachers/password-setup').send({ token, newPassword: 'UpdatedPass123' })).status).toBe(400);
  expect(await ActivityLog.countDocuments({ action: 'RESET_USER_PASSWORD' })).toBe(1);
});
test('expired links and weak passwords cannot reset access; new links replace older ones', async () => {
  const send = () => request(app).post(`/teachers/${teacher._id}/password-link`).set(auth(institute));
  await send(); const oldToken = tokenFromEmail();
  expect((await send()).status).toBe(429);
  await User.updateOne({ _id: teacher._id }, { $set: { 'teacherPasswordSetup.requestedAt': new Date(Date.now() - 61000) } });
  await send(); const token = tokenFromEmail();
  expect((await request(app).post('/teachers/password-setup').send({ token: oldToken, newPassword: 'UpdatedPass123' })).status).toBe(400);
  expect((await request(app).post('/teachers/password-setup').send({ token, newPassword: 'weak' })).status).toBe(400);
  await User.updateOne({ _id: teacher._id }, { $set: { 'teacherPasswordSetup.expiresAt': new Date(Date.now() - 1) } });
  expect((await request(app).post('/teachers/password-setup').send({ token, newPassword: 'UpdatedPass123' })).status).toBe(400);
  expect(await (await User.findById(teacher._id)).comparePassword('OriginalPass123')).toBe(true);
});
test('SMTP failure keeps the teacher account and allows an explicit email retry', async () => {
  email.sendTeacherAccessEmail.mockRejectedValueOnce(new Error('SMTP unavailable'));
  const response = await request(app).post('/teachers').set(auth(institute)).send({ firstName: 'New', lastName: 'Teacher', email: 'new@example.com', department: 'Design', employeeId: 'EMP2' });
  expect(response.status).toBe(201); expect(response.body.invitationEmailSent).toBe(false);
  expect((await User.findById(response.body.data.id).select('+teacherPasswordSetup')).teacherPasswordSetup).toBeUndefined();
  expect((await request(app).post(`/teachers/${response.body.data.id}/password-link`).set(auth(institute))).status).toBe(200);
});

const browserHeaders = { Origin: 'https://certiverxia.example', 'X-Client-Type': 'browser' };
test.each(['/api/auth/login', '/api/teachers/login'])('real browser login, CSRF rejection and logout work through %s', async loginPath => {
  const browser = request.agent(browserApp);
  const login = await browser.post(loginPath).set(browserHeaders).send({ email: teacher.email, password: 'OriginalPass123' });
  expect(login.status).toBe(200);
  expect(login.body.token).toBeUndefined();
  expect(login.headers['set-cookie'][0]).toContain('HttpOnly');
  expect((await browser.get('/api/auth/me')).status).toBe(200);
  expect((await browser.post('/api/auth/logout').set('Origin', browserHeaders.Origin)).status).toBe(403);
  expect((await browser.get('/api/teachers/profile/me')).status).toBe(200);
  expect((await browser.post('/api/auth/logout').set(browserHeaders)).status).toBe(200);
  expect((await browser.get('/api/auth/me')).status).toBe(401);
});

test('two-factor browser login issues a cookie only after the emailed challenge is verified', async () => {
  teacher.twoFactorEnabled = true;
  await teacher.save();
  email.sendOtpEmail.mockResolvedValue({ messageId: 'mock-only' });
  const browser = request.agent(browserApp);
  const challenge = await browser.post('/api/teachers/login').set(browserHeaders).send({ email: teacher.email, password: 'OriginalPass123' });
  expect(challenge.status).toBe(200);
  expect(challenge.body.requiresTwoFactor).toBe(true);
  expect(challenge.headers['set-cookie']).toBeUndefined();
  expect((await browser.get('/api/auth/me')).status).toBe(401);
  const completed = await browser.post('/api/auth/2fa/verify').set(browserHeaders).send({
    challengeToken: challenge.body.challengeToken, otp: email.sendOtpEmail.mock.calls[0][0].otp
  });
  expect(completed.status).toBe(200);
  expect(completed.body.token).toBeUndefined();
  expect(completed.headers['set-cookie'][0]).toContain('HttpOnly');
  expect((await browser.get('/api/auth/me')).status).toBe(200);
});

test.each(['suspended', 'unapproved', 'missing'])('security regression: teacher access requires an available institute (%s)', async state => {
  const headers = auth(teacher);
  expect((await request(browserApp).get('/api/teachers/profile/me').set(headers)).status).toBe(200);
  if (state === 'missing') await User.deleteOne({ _id: institute._id });
  else await User.updateOne({ _id: institute._id }, { $set: state === 'suspended' ? { isActive: false } : { isVerifiedByAdmin: false } });
  for (const route of ['/api/auth/me', '/api/teachers/profile/me', '/api/teachers/students/my']) {
    expect((await request(browserApp).get(route).set(headers)).status).toBe(403);
  }
  for (const route of ['/api/auth/login', '/api/teachers/login']) {
    const response = await request(browserApp).post(route).set(browserHeaders).send({ email: teacher.email, password: 'OriginalPass123' });
    expect(response.status).toBe(403);
    expect(response.body.token).toBeUndefined();
    expect(response.headers['set-cookie']).toBeUndefined();
  }
});

async function teacherChallenge() {
  teacher.twoFactorEnabled = true;
  await teacher.save();
  email.sendOtpEmail.mockResolvedValue({ messageId: 'mock-only' });
  const response = await request(browserApp).post('/api/teachers/login').set(browserHeaders).send({ email: teacher.email, password: 'OriginalPass123' });
  expect(response.body.requiresTwoFactor).toBe(true);
  return { challengeToken: response.body.challengeToken, otp: email.sendOtpEmail.mock.calls.at(-1)[0].otp };
}

test('security regression: a password change invalidates an outstanding two-factor challenge', async () => {
  const challenge = await teacherChallenge();
  const changed = await request(browserApp).post('/api/teachers/change-password')
    .set({ Authorization: `Bearer ${signAccessToken(teacher, { twoFactorVerified: true })}` })
    .send({ currentPassword: 'OriginalPass123', newPassword: 'UpdatedPass123' });
  expect(changed.status).toBe(200);
  const response = await request(browserApp).post('/api/auth/2fa/verify').set(browserHeaders).send(challenge);
  expect(response.status).toBe(401);
  expect(response.body.token).toBeUndefined();
  expect(response.headers['set-cookie']).toBeUndefined();
});

test('security regression: suspension between password and second factor blocks login', async () => {
  const challenge = await teacherChallenge();
  await User.updateOne({ _id: institute._id }, { $set: { isActive: false } });
  const response = await request(browserApp).post('/api/auth/2fa/verify').set(browserHeaders).send(challenge);
  expect(response.status).toBe(403);
  expect(response.headers['set-cookie']).toBeUndefined();
});

test('security regression: legacy challenges without a session version require a fresh login', async () => {
  const challenge = await teacherChallenge();
  await mongoose.model('LoginChallenge').collection.updateOne({ userId: teacher._id }, { $unset: { sessionVersion: 1 } });
  const response = await request(browserApp).post('/api/auth/2fa/verify').set(browserHeaders).send(challenge);
  expect(response.status).toBe(401);
  expect(response.headers['set-cookie']).toBeUndefined();
});

test.each(['password-change', 'institute-suspension'])('security regression: invalidated enrollment cannot enable two-factor authentication (%s)', async change => {
  const response = await request(browserApp).put('/api/auth/2fa/settings').set(auth(teacher)).send({ enabled: true, password: 'OriginalPass123' });
  expect(response.body.requiresTwoFactor).toBe(true);
  const body = { challengeToken: response.body.challengeToken, otp: email.sendOtpEmail.mock.calls.at(-1)[0].otp };
  if (change === 'password-change') {
    const changed = await request(browserApp).post('/api/teachers/change-password').set(auth(teacher))
      .send({ currentPassword: 'OriginalPass123', newPassword: 'UpdatedPass123' });
    expect(changed.status).toBe(200);
  } else await User.updateOne({ _id: institute._id }, { $set: { isActive: false } });
  const completed = await request(browserApp).post('/api/auth/2fa/verify').send(body);
  expect(completed.status).toBe(change === 'password-change' ? 401 : 403);
  expect(completed.body.token).toBeUndefined();
  expect((await User.findById(teacher._id)).twoFactorEnabled).toBe(false);
});

test('security regression: administrator suspension revokes sessions and never returns password hashes', async () => {
  const administrator = await User.create({ email: 'superadmin@example.com', password: 'Administrator123', userType: 'superadmin', superAdminName: 'Test Admin', isActive: true });
  const oldHeaders = auth(teacher);
  const route = `/api/admin/users/${teacher._id}/toggle-status`;
  const suspended = await request(browserApp).put(route).set(auth(administrator));
  expect(suspended.status).toBe(200);
  expect(suspended.body.data.password).toBeUndefined();
  expect(suspended.body.data.teacherPasswordSetup).toBeUndefined();
  expect(JSON.stringify(suspended.body)).not.toContain(teacher.password);
  expect((await request(browserApp).get('/api/teachers/profile/me').set(oldHeaders)).status).toBe(403);
  const resumed = await request(browserApp).put(route).set(auth(administrator));
  expect(resumed.status).toBe(200);
  expect((await request(browserApp).get('/api/teachers/profile/me').set(oldHeaders)).status).toBe(401);
  expect((await request(browserApp).post('/api/teachers/login').send({ email: teacher.email, password: 'OriginalPass123' })).status).toBe(200);
});

test('security regression: institute-controlled teacher deactivation also revokes old sessions', async () => {
  const oldHeaders = auth(teacher);
  for (const isActive of [false, true]) {
    const response = await request(browserApp).put(`/api/teachers/${teacher._id}`).set(auth(institute)).send({ isActive });
    expect(response.status).toBe(200);
    expect(response.body.data.password).toBeUndefined();
  }
  expect((await request(browserApp).get('/api/teachers/profile/me').set(oldHeaders)).status).toBe(401);
  expect((await request(browserApp).put(`/api/teachers/${teacher._id}`).set(auth(institute)).send({ isActive: 'false' })).status).toBe(400);
});

test.each([
  ['/api/teachers/login', { email: { $ne: null }, password: 'OriginalPass123' }],
  ['/api/teachers/login', { email: 'teacher@example.com', password: ['OriginalPass123'] }],
  ['/api/auth/login', { email: 'teacher@example.com', password: 'OriginalPass123', userType: { $ne: 'superadmin' } }]
])('security regression: %s rejects malformed login fields', async (route, input) => {
  const response = await request(browserApp).post(route).send(input);
  expect(response.status).toBe(400);
  expect(response.body.token).toBeUndefined();
});
