jest.mock('../../Backend/models/User', () => {
  const User = jest.fn(function (data) { Object.assign(this, data, { _id: 'new-account', save: jest.fn().mockResolvedValue() }); });
  User.findOne = jest.fn();
  return User;
});
jest.mock('../../Backend/models/OTP', () => ({ deleteMany: jest.fn(), create: jest.fn() }));
jest.mock('../../Backend/utils/emailService', () => ({ sendOtpEmail: jest.fn() }));
jest.mock('../../Backend/utils/smsService', () => ({ sendOtpSms: jest.fn() }));
jest.mock('../../Backend/services/subscriptionService', () => ({ enabled: () => false }));
const User = require('../../Backend/models/User');
const { sendOtpEmail } = require('../../Backend/utils/emailService');
const { sendOtpSms } = require('../../Backend/utils/smsService');
const { registerInstitute } = require('../../Backend/controllers/authController');
const previousSecret = process.env.JWT_SECRET;

beforeEach(() => { jest.clearAllMocks(); User.findOne.mockResolvedValue(null); process.env.JWT_SECRET = 'registration-delivery-test-secret'; });
afterAll(() => {
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});
test.each([
  [true, false, /SMS delivery failed/],
  [false, true, /Email delivery failed/],
  [false, false, /could not send a verification code/],
  [true, true, /Check your email or phone/]
])('registration preserves the account and reports actual channel acceptance: email %s / SMS %s', async (emailSent, smsSent, message) => {
  sendOtpEmail.mockImplementation(async () => { if (!emailSent) throw new Error('email failed'); });
  sendOtpSms.mockImplementation(async () => { if (!smsSent) throw new Error('SMS failed'); });
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  await registerInstitute({ body: { instituteName: 'Test Institute', email: 'new@example.com', phone: '0771234567',
    address: 'Colombo', adminName: 'Test Admin', password: 'TestPassword123', confirmPassword: 'TestPassword123', agreeToTerms: true } }, response);
  expect(User.mock.instances[0].save).toHaveBeenCalledTimes(1);
  expect(response.status).toHaveBeenCalledWith(201);
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, emailSent, smsSent, message: expect.stringMatching(message) }));
  expect(sendOtpSms).toHaveBeenCalledWith(expect.objectContaining({ to: '0771234567' }));
});
