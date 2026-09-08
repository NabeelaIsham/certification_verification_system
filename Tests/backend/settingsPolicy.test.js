jest.mock('../../Backend/models/Settings', () => ({ findOne: jest.fn() }));
jest.mock('../../Backend/models/OTP', () => ({ findOne: jest.fn(), findOneAndUpdate: jest.fn() }));
jest.mock('../../Backend/models/Certificate', () => ({ findOne: jest.fn() }));
jest.mock('../../Backend/utils/emailService', () => ({ sendCertificateEmail: jest.fn() }));
const Settings = require('../../Backend/models/Settings');
const OTP = require('../../Backend/models/OTP');
const Certificate = require('../../Backend/models/Certificate');
const { enforceOtpPolicy } = require('../../Backend/middleware/otpPolicy');
const { updateCertificateStatus, sendCertificateEmail } = require('../../Backend/controllers/certificateController');
const { addLifecycleEvent } = require('../../Backend/controllers/credentialSecurityController');
const validateSettings = require('../../Backend/utils/validateSettings');
const response = () => { const res = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res); return res; };
beforeEach(() => jest.resetAllMocks());
const runOtp = async (mode, policy, record) => {
  Settings.findOne.mockResolvedValue({ verification: policy });
  OTP.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(record) });
  const res = response(); const next = jest.fn();
  await enforceOtpPolicy(mode)({ body: { email: 'admin@example.com' } }, res, next);
  return { res, next };
};
test('disabled resend is rejected by backend', async () => {
  const { res, next } = await runOtp('send-account', { allowResendOtp: false }, null);
  expect(res.status).toHaveBeenCalledWith(403); expect(next).not.toHaveBeenCalled();
});
test('configured cooldown blocks early resend', async () => {
  const { res } = await runOtp('send-reset', { resendCooldown: 120 }, { createdAt: new Date(Date.now() - 90000) });
  expect(res.status).toHaveBeenCalledWith(429);
});
test('a code with a longer configured expiry remains usable after five minutes', async () => {
  OTP.findOneAndUpdate.mockResolvedValue({ attempts: 1 });
  const { next } = await runOtp('verify-account', { maxOtpAttempts: 2 }, { _id: 'otp', createdAt: new Date(Date.now() - 360000), expiresAt: new Date(Date.now() + 240000) });
  expect(next).toHaveBeenCalled();
  expect(OTP.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ $or: expect.arrayContaining([{ attempts: { $lt: 2 } }]) }), { $inc: { attempts: 1 } }, { new: true });
});
test('exhausted attempts reject even a potentially correct code', async () => {
  OTP.findOneAndUpdate.mockResolvedValue(null);
  const { res, next } = await runOtp('verify-reset', { maxOtpAttempts: 1 }, { _id: 'otp', createdAt: new Date(), expiresAt: new Date(Date.now() + 60000) });
  expect(res.status).toHaveBeenCalledWith(429); expect(next).not.toHaveBeenCalled();
});
test('expired codes cannot reach verification', async () => {
  const { res } = await runOtp('verify-account', {}, { expiresAt: new Date(Date.now() - 1) });
  expect(res.status).toHaveBeenCalledWith(400);
});
const certificateQuery = (value) => {
  const query = { populate: jest.fn(() => query), then: resolve => Promise.resolve(value).then(resolve) };
  Certificate.findOne.mockReturnValue(query);
};
test('institutes can issue legacy drafts despite old approval flags', async () => {
  Settings.findOne.mockResolvedValue({ certificate: { requireApproval: true } });
  const certificate = { status: 'draft', approvalRequired: true, generatedCertificateImage: 'image.jpg', lifecycleEvents: [], emailSent: true, save: jest.fn() };
  certificateQuery(certificate);
  const res = response();
  await updateCertificateStatus({ user: { id: 'institute' }, params: { id: 'certificate' }, body: { status: 'issued' } }, res);
  expect(certificate.status).toBe('issued');
  expect(certificate.save).toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
});
test('email still requires an issued certificate', async () => {
  certificateQuery({ status: 'draft' });
  const res = response();
  await sendCertificateEmail({ user: { id: 'institute' }, params: { id: 'certificate' } }, res);
  expect(res.status).toHaveBeenCalledWith(409);
});
test('revocation setting blocks institute lifecycle endpoint', async () => {
  Settings.findOne.mockResolvedValue({ certificate: { allowRevocation: false } });
  const res = response();
  await addLifecycleEvent({ body: { action: 'revoke' } }, res);
  expect(res.status).toHaveBeenCalledWith(403);
});
test.each([
  { verification: { otpExpiry: 0 } }, { verification: { maxOtpAttempts: 99 } },
  { certificate: { maxFileSize: -1 } }, { certificate: { allowedFormats: [] } },
  { email: { smtpPort: 70000 } }, { email: { fromEmail: 'invalid' } }
])('rejects invalid settings %j', updates => expect(validateSettings(updates)).toBeTruthy());
