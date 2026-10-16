const User = require('../models/User');

// Teacher permissions remain subordinate to the owning institute, including
// read-only APIs and both login endpoints. Never trust a token's institute claim.
const hasInstituteAccess = async user => {
  if (user.userType === 'institute') return user.isVerifiedByAdmin === true;
  if (user.userType !== 'teacher') return true;
  const instituteId = user.instituteId?._id || user.instituteId;
  if (!instituteId) return false;
  return Boolean(await User.exists({ _id: instituteId, userType: 'institute', isActive: true, isVerifiedByAdmin: true }));
};

module.exports = { hasInstituteAccess };
