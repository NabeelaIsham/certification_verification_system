const jwt = require('jsonwebtoken');

const signAccessToken = (user, claims = {}) => jwt.sign({
  ...claims,
  userId: user._id,
  email: user.email,
  userType: user.userType,
  sessionVersion: user.sessionVersion || 0
}, process.env.JWT_SECRET, { expiresIn: process.env.JWT_ACCESS_TOKEN_TTL || '15m' });

module.exports = { signAccessToken };
