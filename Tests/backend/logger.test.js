const { appLogger } = require('../../Backend/utils/logger');
const { redactLog } = require('../../Backend/utils/redactLog');

const previous = { ...process.env };
afterEach(() => { process.env = { ...previous }; jest.restoreAllMocks(); });

test('expected failures are silent in tests, including explicit silent mode', () => {
  const output = jest.spyOn(console, 'error').mockImplementation(() => {});
  appLogger.error(new Error('expected failure'));
  process.env.NODE_ENV = 'production';
  process.env.LOG_LEVEL = 'silent';
  appLogger.error('still silent');
  expect(output).not.toHaveBeenCalled();
});

test('structured errors retain safe diagnostics and remove credentials and provider bodies', () => {
  process.env.NODE_ENV = 'production';
  process.env.LOG_LEVEL = 'debug';
  process.env.TEXTLK_API_TOKEN = 'test-provider-credential';
  const output = jest.spyOn(console, 'error').mockImplementation(() => {});
  const failure = Object.assign(new Error('Failed with test-provider-credential at mongodb://dbuser:dbpass@localhost/data'), {
    code: 'ECONNRESET', config: { headers: { Authorization: 'Bearer other-secret' } },
    response: { status: 503, data: 'private-provider-response' }
  });
  appLogger.error('Delivery failed', failure, { password: 'secret-value', nested: { accessToken: 'another-token' } });
  const serialized = output.mock.calls[0][0];
  expect(JSON.parse(serialized)).toMatchObject({ level: 'error', details: ['Delivery failed', { code: 'ECONNRESET', status: 503 }, { password: '[REDACTED]', nested: { accessToken: '[REDACTED]' } }] });
  for (const secret of ['test-provider-credential', 'dbpass', 'other-secret', 'private-provider-response', 'secret-value', 'another-token']) {
    expect(serialized).not.toContain(secret);
  }
});

test('redaction handles bearer strings and cyclic objects without mutating inputs', () => {
  const input = { message: 'Authorization: Bearer abc123', cookie: 'session=abc' };
  input.self = input;
  expect(redactLog(input)).toEqual({ message: 'Authorization: Bearer [REDACTED]', cookie: '[REDACTED]', self: '[Circular]' });
  expect(input.cookie).toBe('session=abc');
});
