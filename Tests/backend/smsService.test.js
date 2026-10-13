jest.mock('axios', () => ({ post: jest.fn() }));
const axios = require('axios');
const { sendTextLkSms } = require('../../Backend/utils/smsService');
const previous = { ...process.env };
beforeEach(() => {
  process.env.TEXTLK_API_TOKEN = ' test-sms-token ';
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
