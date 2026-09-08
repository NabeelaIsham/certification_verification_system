const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Settings = require('../models/Settings');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId || decoded.id);

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check if account is active (for institutes and teachers)
    if (!user.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'Account is deactivated' 
      });
    }

    if (user.twoFactorEnabled && decoded.twoFactorVerified !== true) {
      return res.status(401).json({ success: false, message: 'Please sign in again to complete two-factor authentication.', code: 'TWO_FACTOR_REQUIRED' });
    }
    if (user.userType === 'superadmin') {
      const settings = await Settings.findOne();
      if (settings?.security?.twoFactorAuth && decoded.twoFactorVerified !== true) {
        return res.status(401).json({ success: false, message: 'Please sign in again to complete two-factor authentication.', code: 'TWO_FACTOR_REQUIRED' });
      }
    }

    req.user = user;
    req.userId = user._id;
    req.userType = user.userType;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.warn('Auth middleware warning: token expired at', error.expiredAt);
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false, 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
};

const authorizeInstitute = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'User not authenticated' 
    });
  }
  
  if (req.user.userType !== 'institute') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Institute only.' 
    });
  }
  next();
};

const authorizeSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'User not authenticated' 
    });
  }
  
  if (req.user.userType !== 'superadmin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Super admin only.' 
    });
  }
  next();
};

// NEW: Authorize Teacher middleware
const authorizeTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'User not authenticated' 
    });
  }
  
  if (req.user.userType !== 'teacher') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Teacher only.' 
    });
  }
  next();
};

// NEW: Authorize Teacher OR Institute (for shared resources)
const authorizeTeacherOrInstitute = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'User not authenticated' 
    });
  }
  
  if (req.user.userType !== 'teacher' && req.user.userType !== 'institute') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Teacher or Institute only.' 
    });
  }
  next();
};

// Export all middleware functions
module.exports = {
  authenticateToken,
  authorizeInstitute,
  authorizeSuperAdmin,
  authorizeTeacher,           // Add this
  authorizeTeacherOrInstitute // Add this
};
