jest.mock('../../Backend/models/User', () => ({ findOne: jest.fn(), findById: jest.fn() }));
jest.mock('../../Backend/models/Settings', () => ({ findOne: jest.fn() }));
jest.mock('../../Backend/models/LoginChallenge', () => ({ findOne: jest.fn(), findOneAndUpdate: jest.fn(), findOneAndDelete: jest.fn(), deleteOne: jest.fn() }));
jest.mock('../../Backend/utils/emailService', () => ({ sendOtpEmail: jest.fn() }));
const User = require('../../Backend/models/User');
const Settings = require('../../Backend/models/Settings');
const Challenge = require('../../Backend/models/LoginChallenge');
const { sendOtpEmail } = require('../../Backend/utils/emailService');
const { login } = require('../../Backend/controllers/authController');
const { verifyTwoFactor } = require('../../Backend/controllers/twoFactorController');
const { updateTwoFactor } = require('../../Backend/controllers/twoFactorController');
const { authenticateToken } = require('../../Backend/middleware/authMiddleware');
const jwt = require('jsonwebtoken');

const user = { _id: 'admin-id', email: 'admin@example.com', userType: 'superadmin', isActive: true, comparePassword: jest.fn() };
const response = () => { const res = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res); return res; };
let record;
beforeEach(() => {
  jest.resetAllMocks();
  process.env.JWT_SECRET = 'test-only-two-factor-secret';
  user.comparePassword.mockResolvedValue(true);
  User.findOne.mockResolvedValue(user);
  User.findById.mockResolvedValue(user);
  Settings.findOne.mockResolvedValue({ security: { twoFactorAuth: true } });
  Challenge.findOneAndUpdate.mockImplementation(async (filter, update) => {
    if (update.$inc) return record;
    record = { _id: 'challenge-id', userId: user._id, ...update };
    return record;
  });
  Challenge.findOneAndDelete.mockImplementation(async () => { const result = record; record = null; return result; });
});
async function start() {
  const res = response();
  await login({ body: { email: user.email, password: 'valid-password' } }, res);
  return res;
}
test('password login requires a code and stores only hashes', async () => {
  const res = await start();
  const data = res.json.mock.calls[0][0];
  expect(data.requiresTwoFactor).toBe(true);
  expect(data.token).toBeUndefined();
  expect(record.tokenHash).not.toBe(data.challengeToken);
  expect(record.codeHash).not.toBe(sendOtpEmail.mock.calls[0][0].otp);
});
test('valid code issues a verified session and cannot be reused', async () => {
  const initial = await start();
  const body = { challengeToken: initial.json.mock.calls[0][0].challengeToken, otp: sendOtpEmail.mock.calls[0][0].otp };
  const res = response();
  await verifyTwoFactor({ body }, res);
  expect(jwt.verify(res.json.mock.calls[0][0].token, process.env.JWT_SECRET).twoFactorVerified).toBe(true);
  const replay = response();
  await verifyTwoFactor({ body }, replay);
  expect(replay.status).toHaveBeenCalledWith(401);
});
test('wrong code cannot issue a session', async () => {
  const initial = await start();
  const res = response();
  await verifyTwoFactor({ body: { challengeToken: initial.json.mock.calls[0][0].challengeToken, otp: '000000' } }, res);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(Challenge.findOneAndDelete).not.toHaveBeenCalled();
  expect(Challenge.findOneAndUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ attempts: { $lt: 3 }, expiresAt: { $gt: expect.any(Date) } }), { $inc: { attempts: 1 } }, { new: true });
});
test('delivery failure does not issue a challenge or session', async () => {
  sendOtpEmail.mockRejectedValue(new Error('SMTP unavailable'));
  const res = await start();
  expect(res.status).toHaveBeenCalledWith(503);
  expect(Challenge.deleteOne).toHaveBeenCalled();
});
test('expired or exhausted challenges cannot issue a session', async () => {
  const initial = await start();
  Challenge.findOneAndUpdate.mockResolvedValue(null);
  const res = response();
  await verifyTwoFactor({ body: { challengeToken: initial.json.mock.calls[0][0].challengeToken, otp: sendOtpEmail.mock.calls[0][0].otp } }, res);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(Challenge.findOneAndDelete).not.toHaveBeenCalled();
});
test('repeated code requests respect the cooldown', async () => {
  Challenge.findOne.mockResolvedValue({ createdAt: new Date() });
  const res = await start();
  expect(res.status).toHaveBeenCalledWith(429);
  expect(sendOtpEmail).not.toHaveBeenCalled();
});
test('accounts deactivated after the password step cannot complete login', async () => {
  const initial = await start();
  User.findById.mockResolvedValue({ ...user, isActive: false });
  const res = response();
  await verifyTwoFactor({ body: { challengeToken: initial.json.mock.calls[0][0].challengeToken, otp: sendOtpEmail.mock.calls[0][0].otp } }, res);
  expect(res.status).toHaveBeenCalledWith(403);
});
test('disabled 2FA preserves normal login', async () => {
  Settings.findOne.mockResolvedValue({ security: { twoFactorAuth: false } });
  const res = await start();
  expect(res.json.mock.calls[0][0].token).toBeDefined();
  expect(sendOtpEmail).not.toHaveBeenCalled();
});
test('protected APIs reject a session without completed 2FA', async () => {
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
  const res = response();
  const next = jest.fn();
  await authenticateToken({ headers: { authorization: `Bearer ${token}` } }, res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});
test.each(['institute', 'teacher'])('%s login requires its enabled second factor and preserves dashboard fields', async userType => {
  const account = { ...user, userType, twoFactorEnabled: true, isVerifiedByAdmin: true, isEmailVerified: true, instituteName: 'Example Institute', firstName: 'Ada', instituteId: 'institute-id', permissions: { canCreateStudents: true } };
  User.findOne.mockResolvedValue(account); User.findById.mockResolvedValue(account);
  const initial = await start();
  const challenge = initial.json.mock.calls[0][0];
  expect(challenge.requiresTwoFactor).toBe(true); expect(challenge.token).toBeUndefined();
  const verified = response();
  await verifyTwoFactor({ body: { challengeToken: challenge.challengeToken, otp: sendOtpEmail.mock.calls[0][0].otp } }, verified);
  expect(verified.json.mock.calls[0][0].user).toEqual(expect.objectContaining({ userType, instituteId: 'institute-id', permissions: { canCreateStudents: true } }));
});
test('enrollment does not enable 2FA until the emailed code is verified', async () => {
  const account = { ...user, userType: 'teacher', twoFactorEnabled: false, save: jest.fn() };
  const initial = response();
  await updateTwoFactor({ user: account, userId: account._id, body: { enabled: true, password: 'password' } }, initial);
  expect(account.twoFactorEnabled).toBe(false); expect(account.save).not.toHaveBeenCalled();
  User.findById.mockResolvedValue(account);
  const verified = response();
  await verifyTwoFactor({ body: { challengeToken: initial.json.mock.calls[0][0].challengeToken, otp: sendOtpEmail.mock.calls[0][0].otp } }, verified);
  expect(account.twoFactorEnabled).toBe(true); expect(account.save).toHaveBeenCalled();
});
test('disabling 2FA requires the current password', async () => {
  const account = { ...user, userType: 'teacher', twoFactorEnabled: true, comparePassword: jest.fn().mockResolvedValue(false), save: jest.fn() };
  const res = response();
  await updateTwoFactor({ user: account, body: { enabled: false, password: 'wrong' } }, res);
  expect(res.status).toHaveBeenCalledWith(400); expect(account.save).not.toHaveBeenCalled();
});
test('disabling clears outstanding login challenges', async () => {
  const account = { ...user, userType: 'teacher', twoFactorEnabled: true, save: jest.fn() };
  await updateTwoFactor({ user: account, userId: account._id, body: { enabled: false, password: 'password' } }, response());
  expect(account.twoFactorEnabled).toBe(false); expect(Challenge.deleteOne).toHaveBeenCalledWith({ userId: account._id });
});
test('separate teacher login cannot bypass 2FA', async () => {
  const account = { ...user, userType: 'teacher', twoFactorEnabled: true };
  User.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(account) });
  const res = response();
  await require('../../Backend/controllers/teacherController').teacherLogin({ body: { email: account.email, password: 'password' } }, res);
  expect(res.json.mock.calls[0][0].requiresTwoFactor).toBe(true); expect(res.json.mock.calls[0][0].token).toBeUndefined();
});
test.each(['institute', 'teacher'])('%s protected API rejects old password-only sessions', async userType => {
  User.findById.mockResolvedValue({ ...user, userType, twoFactorEnabled: true });
  const res = response(); const next = jest.fn();
  await authenticateToken({ headers: { authorization: `Bearer ${jwt.sign({ userId: user._id }, process.env.JWT_SECRET)}` } }, res, next);
  expect(res.status).toHaveBeenCalledWith(401); expect(next).not.toHaveBeenCalled();
});
