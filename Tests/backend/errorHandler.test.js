const express = require('express');
const request = require('supertest');
const errorHandler = require('../../Backend/middleware/errorHandler');

const app = express();
app.use(express.json({ limit: '100b' }));
app.post('/body', (req, res) => res.json(req.body));
app.get('/failure', async () => { throw new Error('private database credentials'); });
app.get('/invalid-status', () => { throw Object.assign(new Error('private'), { status: 999 }); });
app.use(errorHandler);

test('malformed JSON returns a stable client error', async () => {
  const response = await request(app).post('/body').set('Content-Type', 'application/json').send('{');
  expect(response.status).toBe(400);
  expect(response.body.code).toBe('INVALID_JSON');
});

test('oversized bodies preserve the 413 response', async () => {
  const response = await request(app).post('/body').send({ text: 'x'.repeat(200) });
  expect(response.status).toBe(413);
  expect(response.body.code).toBe('PAYLOAD_TOO_LARGE');
});

test.each(['/failure', '/invalid-status'])('async failures do not leak internal details: %s', async (url) => {
  const response = await request(app).get(url);
  expect(response.status).toBe(500);
  expect(response.body).toEqual({ success: false, code: 'INTERNAL_ERROR', message: 'Something went wrong!' });
});
