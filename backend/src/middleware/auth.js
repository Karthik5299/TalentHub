const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

// ─────────────────────────────────────────────────────────
// protect — verify Bearer token, attach req.user
// ─────────────────────────────────────────────────────────
exports.protect = async (req, res, next) => {
  try {
    // 1. Extract token from Authorization header
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return ApiResponse.error(res, 'No token provided. Please log in.', 401);
    }

    // 2. Verify token signature + expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return ApiResponse.error(res, 'Token expired. Please log in again.', 401);
      }
      return ApiResponse.error(res, 'Invalid token. Please log in again.', 401);
    }

    // 3. Fetch user from DB — role, isActive, employeeId all needed
    //    Do NOT use select() here to avoid accidentally excluding fields
    const user = await User.findById(decoded.id);
    if (!user) {
      return ApiResponse.error(res, 'User no longer exists.', 401);
    }

    // 4. Check account active
    if (!user.isActive) {
      return ApiResponse.error(res, 'Account deactivated. Contact your admin.', 401);
    }

    // 5. Attach to request
    req.user = user;
    next();
  } catch (error) {
    console.error('protect middleware error:', error);
    return ApiResponse.error(res, 'Authentication failed.', 401);
  }
};

// ─────────────────────────────────────────────────────────
// authorize — role-based access control
// Usage: authorize('admin')  or  authorize('admin', 'manager')
// ─────────────────────────────────────────────────────────
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 'Not authenticated.', 401);
    }
    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(
        res,
        `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}.`,
        403
      );
    }
    next();
  };
};
