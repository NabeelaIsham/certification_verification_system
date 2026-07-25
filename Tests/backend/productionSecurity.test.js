const express = require('express');
const request = require('supertest');
const { validateProductionConfig } = require('../../Backend/config/production');
const {
  createRateLimit,
  resetRateLimitStores
} = require('../../Backend/middleware/rateLimit');
const { app } = require('../../Backend/server');
const { generateCertificateCode } = require('../../Backend/utils/CertificateCodeGenerator');
const { isValidPassword } = require('../../Backend/utils/validators');

const validEnvironment = {
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb://mongo:27017/certverify',
  JWT_SECRET: 'j'.repeat(40),
  CREDENTIAL_KEY_ENCRYPTION_SECRET: 'c'.repeat(40),
  VERIFICATION_PRIVACY_SECRET: 'p'.repeat(40),
  API_URL: 'https://api.example.com',
  FRONTEND_URL: 'https://example.com',
  CORS_ORIGIN: 'https://example.com',
  TRUST_PROXY: '1',
  VERIFICATION_LOG_RETENTION_DAYS: '180',
  SHARE_RECORD_RETENTION_DAYS: '30'
};

describe('Production security controls', () => {
  afterEach(() => resetRateLimitStores());

  it('accepts a complete production environment', () => {
    expect(validateProductionConfig(validEnvironment)).toEqual({ valid: true, errors: [] });
  });

  it('rejects reused secrets and insecure URLs', () => {
    const invalid = {
      ...validEnvironment,
      FRONTEND_URL: 'http://example.com',
      VERIFICATION_PRIVACY_SECRET: validEnvironment.JWT_SECRET
    };
    const result = validateProductionConfig(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/must be different/);
    expect(result.errors.join(' ')).toMatch(/HTTPS/);
  });

  it('returns 429 with rate-limit headers after the configured maximum', async () => {
    const app = express();
    app.set('trust proxy', false);
    app.get('/limited', createRateLimit({ windowMs: 60000, max: 2, keyPrefix: 'test' }), (req, res) => {
      res.json({ success: true });
    });

    expect((await request(app).get('/limited')).status).toBe(200);
    expect((await request(app).get('/limited')).status).toBe(200);
    const blocked = await request(app).get('/limited');
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeTruthy();
  });

  it('returns security headers and unhealthy readiness without MongoDB', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(503);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.body.database).toBe('disconnected');
  });

  it('allows the configured local frontend and rejects unknown browser origins', async () => {
    const allowed = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:3000');
    expect(allowed.status).toBe(503);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');

    const blocked = await request(app)
      .get('/health')
      .set('Origin', 'https://untrusted.example');
    expect(blocked.status).toBe(403);
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('generates high-entropy non-sequential certificate codes', () => {
    const codes = new Set(
      Array.from({ length: 100 }, () => generateCertificateCode('Example University', '2026-07-25'))
    );
    expect(codes.size).toBe(100);
    for (const code of codes) {
      expect(code).toMatch(/^EXA-260725-[A-Z2-9]{10}$/);
    }
  });

  it('enforces the production password policy', () => {
    expect(isValidPassword('short')).toBe(false);
    expect(isValidPassword('alllowercase123')).toBe(false);
    expect(isValidPassword('NoNumbersHere')).toBe(false);
    expect(isValidPassword('StrongPass123')).toBe(true);
  });
});
