jest.mock('axios', () => ({ post: jest.fn() }));
const axios = require('axios');
const { sendTextLkSms } = require('../../Backend/utils/smsService');
const previous = { ...process.env };
beforeEach(() => {
  process.env.TEXTLK_API_TOKEN = ' test-sms-token ';
  process.env.TEXTLK_SENDER_ID = 'Certiverxia';
  process.env.TEXTLK_TIMEOUT_MS = '10000';
  process.env.TEXTLK_SMS_ENDPOINT = 'https://app.text.lk/api/v3/sms/send';
  process.env.DEPLOYMENT_ENV = 'production';
  process.env.OUTBOUND_DELIVERY_MODE = 'live';
  jest.clearAllMocks();
});
afterAll(() => { process.env = previous; });

test('trims configured credentials and does not forward authenticated requests through redirects', async () => {
  axios.post.mockResolvedValue({ data: { status: 'success' } });
  await sendTextLkSms({ to: '0771234567', message: 'Test message' });
  expect(axios.post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ recipient: '94771234567' }),
    expect.objectContaining({ maxRedirects: 0, headers: expect.objectContaining({ Authorization: 'Bearer test-sms-token' }) }));
});

test('provider rejection never copies raw credential or message data into the thrown error', async () => {
  axios.post.mockRejectedValue({ response: { status: 401, data: { message: 'test-sms-token private OTP content' } } });
  let failure;
  try { await sendTextLkSms({ to: '0771234567', message: 'Test' }); } catch (error) { failure = error; }
  expect(failure).toMatchObject({ code: 'SMS_AUTH_FAILED', status: 401 });
  expect(failure.message).not.toContain('test-sms-token');
  expect(failure.message).not.toContain('private OTP content');
  expect(failure.providerResponse).toBeUndefined();
});

test('refuses insecure provider endpoints before sending credentials', async () => {
  process.env.TEXTLK_SMS_ENDPOINT = 'http://app.text.lk/api/v3/sms/send';
  await expect(sendTextLkSms({ to: '0771234567', message: 'Test' })).rejects.toThrow('HTTPS');
  expect(axios.post).not.toHaveBeenCalled();
});

test.each([
  ['TEXTLK_API_TOKEN', ''], ['TEXTLK_SENDER_ID', ''],
  ['TEXTLK_SENDER_ID', 'TextLKDemo'], ['TEXTLK_TIMEOUT_MS', '0'],
  ['TEXTLK_TIMEOUT_MS', 'NaN'], ['TEXTLK_TIMEOUT_MS', '120001'],
  ['TEXTLK_SMS_ENDPOINT', 'not-a-url'],
  ['TEXTLK_SMS_ENDPOINT', 'https://private:secret@app.text.lk/api/v3/sms/send']
])('rejects invalid %s configuration without sending any request', async (name, value) => {
  process.env[name] = value;
  await expect(sendTextLkSms({ to: '0771234567', message: 'Test' })).rejects.toMatchObject({ code: 'SMS_CONFIGURATION_INVALID' });
  expect(axios.post).not.toHaveBeenCalled();
});

test('configuration diagnostics never include a secret or a credentialed URL', () => {
  const { validateTextLkConfiguration } = require('../../Backend/utils/smsConfiguration');
  const report = validateTextLkConfiguration({
    DEPLOYMENT_ENV: 'production', TEXTLK_API_TOKEN: 'private-token\nvalue',
    TEXTLK_SENDER_ID: 'TextLKDemo', TEXTLK_SMS_ENDPOINT: 'https://private-user:private-password@app.text.lk'
  });
  expect(report.valid).toBe(false);
  expect(JSON.stringify(report)).not.toMatch(/private-token|private-user|private-password/);
});

test.each([true, 'success'])('accepts the documented provider success status %s', async status => {
  axios.post.mockResolvedValue({ status: 200, data: { status, data: { status: 'Queued' } } });
  await expect(sendTextLkSms({ to: '0771234567', message: 'Test' })).resolves.toMatchObject({ status });
});

test.each([
  [{ status: false, message: 'Invalid sender_id' }, 'SMS_SENDER_REJECTED'],
  [{ status: 'error', message: 'Insufficient balance' }, 'SMS_INSUFFICIENT_CREDIT'],
  [{ status: 'error', message: 'Invalid recipient number' }, 'SMS_INVALID_RECIPIENT'],
  [{ status: 'error', message: 'Unauthenticated' }, 'SMS_AUTH_FAILED'],
  [{ status: 'success', data: { status: 'Failed' } }, 'SMS_PROVIDER_REJECTED'],
  ['<html>sign in</html>', 'SMS_UNEXPECTED_RESPONSE']
])('does not report HTTP 200 provider rejection as a sent SMS: %j', async (body, code) => {
  axios.post.mockResolvedValue({ status: 200, data: body });
  await expect(sendTextLkSms({ to: '0771234567', message: 'Test' })).rejects.toMatchObject({ code });
});
