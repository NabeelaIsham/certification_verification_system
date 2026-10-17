const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
jest.mock('../../Backend/models/User', () => ({ findById: jest.fn(), exists: jest.fn() }));
jest.mock('../../Backend/models/Settings', () => ({ findOne: jest.fn() }));
const User = require('../../Backend/models/User');
const { browserSession, clearSession } = require('../../Backend/middleware/browserSession');
const { authenticateToken } = require('../../Backend/middleware/authMiddleware');

const origin = 'https://portal.example.com';
const previous = { ...process.env };
const app = express();
app.use(express.json(), browserSession);
app.post('/api/login', (_req, res) => res.json({ success: true, token: jwt.sign({ userId: 'teacher', sessionVersion: 2 }, process.env.JWT_SECRET, { expiresIn: '15m' }) }));
app.get('/api/me', authenticateToken, (req, res) => res.json({ id: req.userId }));
app.post('/api/change', authenticateToken, (_req, res) => res.json({ success: true }));
app.post('/api/logout', clearSession);

beforeEach(() => {
  process.env.JWT_SECRET = 'test-browser-session-secret';
  process.env.CORS_ALLOWED_ORIGINS = origin;
  User.findById.mockResolvedValue({ _id: 'teacher', userType: 'teacher', instituteId: 'institute-id', isActive: true, sessionVersion: 2 });
  User.exists.mockResolvedValue({ _id: 'institute-id' });
});
afterAll(() => { process.env = previous; });
const login = () => request(app).post('/api/login').set('Origin', origin).set('X-Client-Type', 'browser');

test('browser login sets an HttpOnly cookie without exposing the token in JSON', async () => {
  const response = await login();
  expect(response.status).toBe(200);
  expect(response.body.token).toBeUndefined();
  expect(response.headers['set-cookie'][0]).toMatch(/HttpOnly/);
  expect(response.headers['set-cookie'][0]).toMatch(/SameSite=Lax/);
  expect(response.headers['set-cookie'][0]).toMatch(/Path=\/api/);
  const cookie = response.headers['set-cookie'][0].split(';')[0];
  expect((await request(app).get('/api/me').set('Cookie', cookie)).status).toBe(200);
  User.findById.mockResolvedValueOnce({ _id: 'teacher', isActive: true, sessionVersion: 3 });
  expect((await request(app).get('/api/me').set('Cookie', cookie)).body.code).toBe('SESSION_REVOKED');
});

test('production cookies are Secure and logout clears the same cookie path', async () => {
  process.env.NODE_ENV = 'production';
  try {
    const response = await login();
    expect(response.headers['set-cookie'][0]).toMatch(/^__Secure-certiverxia_session=/);
    expect(response.headers['set-cookie'][0]).toMatch(/; Secure;/);
    const loggedOut = await request(app).post('/api/logout').set('Origin', origin).set('X-Client-Type', 'browser');
    expect(loggedOut.headers['set-cookie'][0]).toMatch(/__Secure-certiverxia_session=;/);
    expect(loggedOut.headers['set-cookie'][0]).toMatch(/Path=\/api/);
  } finally { process.env.NODE_ENV = 'test'; }
});

test.each([
  { origin, header: false },
  { origin: 'https://attacker.example.com', header: true },
  { origin: null, header: true }
])('cookie mutations reject missing headers or untrusted origins: %j', async ({ origin: requestOrigin, header }) => {
  const response = await login();
  let mutation = request(app).post('/api/change').set('Cookie', response.headers['set-cookie'][0].split(';')[0]);
  if (requestOrigin) mutation = mutation.set('Origin', requestOrigin);
  if (header) mutation = mutation.set('X-Client-Type', 'browser');
  expect((await mutation).body.code).toBe('CSRF_REJECTED');
});

test('trusted browser mutations and explicit non-browser bearer clients remain supported', async () => {
  const response = await login();
  expect((await request(app).post('/api/change').set('Cookie', response.headers['set-cookie'][0].split(';')[0]).set('Origin', origin).set('X-Client-Type', 'browser')).status).toBe(200);
  const apiLogin = await request(app).post('/api/login');
  expect(apiLogin.body.token).toBeTruthy();
  expect(apiLogin.headers['set-cookie']).toBeUndefined();
  expect((await request(app).post('/api/change').set('Authorization', `Bearer ${apiLogin.body.token}`)).status).toBe(200);
});
