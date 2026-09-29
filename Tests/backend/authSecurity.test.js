jest.mock('../../Backend/models/User', () => ({ findOne: jest.fn(), findById: jest.fn(), findByIdAndUpdate: jest.fn() }));
jest.mock('../../Backend/models/OTP', () => ({ findOne: jest.fn(), findOneAndDelete: jest.fn(), deleteMany: jest.fn(), create: jest.fn() }));
jest.mock('../../Backend/utils/emailService', () => ({ sendOtpEmail: jest.fn() }));
jest.mock('../../Backend/utils/smsService', () => ({ sendOtpSms: jest.fn() }));

const jwt = require('jsonwebtoken');
const User = require('../../Backend/models/User');
const OTP = require('../../Backend/models/OTP');
const { sendOtpEmail } = require('../../Backend/utils/emailService');
const auth = require('../../Backend/controllers/authController');
const { teacherLogin } = require('../../Backend/controllers/teacherController');
const { changePassword: changeTeacherPassword } = require('../../Backend/controllers/teacherController');
const { changePassword: changeInstitutePassword } = require('../../Backend/controllers/instituteController');
const { updateSettings } = require('../../Backend/controllers/instituteController');
const { updateTeacherProfile } = require('../../Backend/controllers/teacherController');
const { authenticateToken } = require('../../Backend/middleware/authMiddleware');
const { accountInstructionsResponse } = require('../../Backend/utils/authResponses');
const response = () => {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
};
const originalEnv = { ...process.env };
beforeEach(() => {
  jest.resetAllMocks();
  process.env.JWT_SECRET = 'test-only-auth-security-secret';
  delete process.env.JWT_ACCESS_TOKEN_TTL;
});
afterAll(() => { process.env = originalEnv; });

test.each([undefined, '5m'])('teacher tokens respect TTL %s and are revoked after session changes', async ttl => {
  if (ttl) process.env.JWT_ACCESS_TOKEN_TTL = ttl;
  const teacher = { _id: 'teacher-id', email: 'teacher@example.com', userType: 'teacher', isActive: true,
    sessionVersion: 3, instituteId: 'institute-id', comparePassword: jest.fn().mockResolvedValue(true) };
  User.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(teacher) });
  const res = response();
  await teacherLogin({ body: { email: teacher.email, password: 'StrongPass123' } }, res);
  const { token } = res.json.mock.calls[0][0];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  expect(decoded.exp - decoded.iat).toBe(ttl ? 300 : 900);
  expect(decoded.sessionVersion).toBe(3);
  User.findById.mockResolvedValue({ ...teacher, sessionVersion: 4 });
  const denied = response();
  const next = jest.fn();
  await authenticateToken({ headers: { authorization: `Bearer ${token}` } }, denied, next);
  expect(denied.status).toHaveBeenCalledWith(401);
  expect(denied.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'SESSION_REVOKED' }));
  expect(next).not.toHaveBeenCalled();
});

test.each(['missing', 'eligible', 'mail-failure'])('password recovery conceals %s account state', async state => {
  User.findOne.mockResolvedValue(state === 'missing' ? null : { email: 'user@example.com' });
  if (state === 'mail-failure') sendOtpEmail.mockRejectedValue(new Error('SMTP unavailable'));
  const res = response();
  await auth.forgotPassword({ body: { email: 'user@example.com' } }, res);
  expect(res.status).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith(accountInstructionsResponse());
  expect(sendOtpEmail).toHaveBeenCalledTimes(state === 'missing' ? 0 : 1);
});

test.each([changeTeacherPassword, changeInstitutePassword])('password changes revoke all existing sessions', async changePassword => {
  const user = { sessionVersion: 2, comparePassword: jest.fn().mockResolvedValue(true), save: jest.fn() };
  User.findById.mockResolvedValue(user);
  const res = response();
  await changePassword({ userId: 'user-id', body: { currentPassword: 'OldPass1234', newPassword: 'NewPass1234' } }, res);
  expect(user.sessionVersion).toBe(3);
  expect(user.save).toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
});

test.each([updateSettings, updateTeacherProfile])('profile edits cannot undo session revocation or modify privileged fields', async updateProfile => {
  User.findByIdAndUpdate.mockReturnValue({ select: jest.fn().mockResolvedValue({ phone: '123' }) });
  const res = response();
  await updateProfile({ userId: 'user-id', body: {
    phone: '123', sessionVersion: 0, twoFactorEnabled: false, userType: 'superadmin',
    isActive: true, 'credentialSigning.keyId': 'forged', 'permissions.canIssueCertificates': true
  } }, res);
  expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user-id', { $set: { phone: '123' } }, expect.any(Object));
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
});

test.each([null, { email: 'user@example.com' }, { email: 'user@example.com', isEmailVerified: true }])('resend conceals account state %j', async user => {
  User.findOne.mockResolvedValue(user);
  const res = response();
  await auth.resendOtp({ body: { email: 'user@example.com' } }, res);
  expect(res.status).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith(accountInstructionsResponse());
});

test('public status never looks up or exposes account details', async () => {
  const res = response();
  await auth.verificationStatus({ params: { email: 'user@example.com' } }, res);
  expect(User.findOne).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith(accountInstructionsResponse());
});

test.each(['verifyOtp', 'resetPassword'])('%s returns identical errors for unknown accounts and wrong codes', async method => {
  const req = { body: { email: 'user@example.com', otp: '000000', newPassword: 'StrongPass123' } };
  User.findOne.mockResolvedValue(null);
  const missing = response();
  await auth[method](req, missing);
  User.findOne.mockResolvedValue({ email: req.body.email });
  OTP.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(null) });
  OTP.findOneAndDelete.mockResolvedValue(null);
  const wrong = response();
  await auth[method](req, wrong);
  expect(missing.status).toHaveBeenCalledWith(400);
  expect(wrong.status).toHaveBeenCalledWith(400);
  expect(missing.json.mock.calls).toEqual(wrong.json.mock.calls);
});
