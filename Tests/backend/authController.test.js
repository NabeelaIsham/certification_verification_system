const request = require('supertest');
const express = require('express');
const bodyParser = require('express').json;

const authRoutes = require('../../Backend/routes/authRoutes');

const app = express();
app.use(bodyParser());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  it('returns 400 when required fields are missing for register', async () => {
    const response = await request(app).post('/api/auth/register').send({});
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('returns 400 for invalid forgot-password input', async () => {
    const response = await request(app).post('/api/auth/forgot-password').send({});
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
