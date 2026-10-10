jest.mock('../../Backend/utils/emailService', () => ({ sendTeacherAccessEmail: jest.fn() }));
process.env.NODE_ENV = 'test';
process.env.SAAS_ENABLED = 'false';
process.env.JWT_SECRET = 'teacher-access-test-only-secret';
process.env.FRONTEND_URL = 'https://certiverxia.example';
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
let db, institute, other, teacher;
const auth = user => ({ Authorization: `Bearer ${signAccessToken(user)}` });
const tokenFromEmail = () => new URLSearchParams(new URL(email.sendTeacherAccessEmail.mock.calls.at(-1)[0].url).hash.slice(1)).get('token');
beforeAll(async () => {
  db = await MongoMemoryReplSet.create({ binary: { version: '8.0.17' }, replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(db.getUri(), { dbName: 'teacher_access_tests' });
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
