const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId || decoded.id);

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check if account is active (for institutes)
    if (user.userType === 'institute' && !user.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'Account is deactivated' 
      });
    }

    req.user = user;
    req.userId = user._id;
    req.userType = user.userType;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        success: false, 
        message: 'Token expired' 
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

module.exports = {
  authenticateToken,
  authorizeInstitute,
  authorizeSuperAdmin
};