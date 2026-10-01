const { requireDatabaseUri } = require('../../Backend/config/databaseUri');
const { assertDeliveryAllowed } = require('../../Backend/utils/deliveryPolicy');
const { validateProductionConfig } = require('../../Backend/config/production');

describe('Deployment isolation', () => {
  test.each([
    undefined, 'mongodb://localhost:27017', 'mongodb://localhost:27017/',
    'mongodb://localhost/admin', 'mongodb://localhost/%61dmin',
    'mongodb://localhost/db/extra', 'mongodb://localhost/db#fragment'
  ])('rejects an absent, reserved or ambiguous database: %s', (uri) => {
    expect(() => requireDatabaseUri({ MONGODB_URI: uri })).toThrow();
  });

  test('keeps staging and production databases separate', () => {
    const staging = 'mongodb+srv://user:password@cluster.test/certverify_staging_20260930?retryWrites=true';
    expect(requireDatabaseUri({ MONGODB_URI: staging, DEPLOYMENT_ENV: 'staging' })).toBe(staging);
    expect(() => requireDatabaseUri({ MONGODB_URI: staging, DEPLOYMENT_ENV: 'production' })).toThrow();
    expect(() => requireDatabaseUri({ MONGODB_URI: 'mongodb://localhost/certverify', DEPLOYMENT_ENV: 'staging' })).toThrow();
  });

  test('blocks delivery by default in staging, including restored live settings', () => {
    for (const channel of ['email', 'sms']) {
      expect(() => assertDeliveryAllowed(channel, 'someone', { DEPLOYMENT_ENV: 'staging' })).toThrow();
      expect(() => assertDeliveryAllowed(channel, 'someone', { DEPLOYMENT_ENV: 'staging', OUTBOUND_DELIVERY_MODE: 'live' })).toThrow();
    }
  });

  test('allows only explicitly listed recipients, without display-name or multi-address bypasses', () => {
    const env = { DEPLOYMENT_ENV: 'staging', OUTBOUND_DELIVERY_MODE: 'allowlist', STAGING_EMAIL_ALLOWLIST: 'test@example.com' };
    expect(() => assertDeliveryAllowed('email', 'TEST@example.com', env)).not.toThrow();
    for (const recipient of ['test@example.com,other@example.com', 'Test <test@example.com>', ['test@example.com', 'other@example.com'], { address: 'test@example.com' }]) {
      expect(() => assertDeliveryAllowed('email', recipient, env)).toThrow();
    }
    expect(() => assertDeliveryAllowed('sms', 'test@example.com', env)).toThrow();
  });

  test('rejects a mistyped environment or delivery mode', () => {
    expect(() => assertDeliveryAllowed('email', 'someone', { DEPLOYMENT_ENV: 'stagng' })).toThrow();
    expect(() => assertDeliveryAllowed('email', 'someone', { OUTBOUND_DELIVERY_MODE: 'allowlst' })).toThrow();
    const result = validateProductionConfig({ NODE_ENV: 'production', DEPLOYMENT_ENV: 'staging', OUTBOUND_DELIVERY_MODE: 'live' });
    expect(result.errors.join(' ')).toMatch(/OUTBOUND_DELIVERY_MODE/);
  });
});
