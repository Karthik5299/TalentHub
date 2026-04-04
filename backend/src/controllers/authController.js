const User = require('../models/User');
const { sendTokens, generateAccessToken } = require('../utils/generateToken');
const ApiResponse = require('../utils/apiResponse');
const jwt = require('jsonwebtoken');

// POST /api/auth/bootstrap
exports.bootstrap = async (req, res, next) => {
  try {
    const count = await User.countDocuments();
    if (count > 0) {
      return ApiResponse.error(
        res,
        'System already has users. Use POST /api/auth/register (admin token required).',
        403
      );
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return ApiResponse.error(res, 'name, email and password are required.', 400);
    }

    if (password.length < 8) {
      return ApiResponse.error(res, 'Password must be at least 8 characters.', 400);
    }

    const user = await User.create({ name, email, password, role: 'admin' });

    return ApiResponse.success(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      'Admin account created successfully. You can now log in.',
      201
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return ApiResponse.error(res, 'email and password are required.', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password +loginAttempts +lockUntil');

    if (!user) {
      return ApiResponse.error(res, 'Invalid email or password.', 401);
    }

    if (user.isLocked) {
      const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return ApiResponse.error(
        res,
        `Account locked due to too many failed attempts. Try again in ${mins} minute(s).`,
        423
      );
    }

    if (!user.isActive) {
      return ApiResponse.error(res, 'Account deactivated. Contact your admin.', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return ApiResponse.error(res, 'Invalid email or password.', 401);
    }

    await user.resetLoginAttempts();

    if (
      user.mustChangePassword &&
      user.tempPasswordExpiresAt &&
      user.tempPasswordExpiresAt < new Date()
    ) {
      return ApiResponse.error(
        res,
        'Temporary password expired. Please contact admin for a new reset.',
        401
      );
    }

    const { accessToken } = sendTokens(res, user);

    return ApiResponse.success(
      res,
      {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
          mustChangePassword: user.mustChangePassword,
        },
      },
      'Login successful.'
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/register (admin only)
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, employeeId } = req.body;

    if (!name || !email || !password) {
      return ApiResponse.error(res, 'name, email and password are required.', 400);
    }

    if (password.length < 8) {
      return ApiResponse.error(res, 'Password must be at least 8 characters.', 400);
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return ApiResponse.error(res, 'A user with this email already exists.', 400);
    }

    const userData = {
      name,
      email,
      password,
      role: role || 'employee',
    };

    if (employeeId) userData.employeeId = employeeId;

    const user = await User.create(userData);

    return ApiResponse.success(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
        },
      },
      'User account created successfully.',
      201
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/refresh
exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return ApiResponse.error(res, 'No refresh token. Please log in again.', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return ApiResponse.error(res, 'Refresh token expired or invalid. Please log in again.', 401);
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return ApiResponse.error(res, 'User not found or inactive.', 401);
    }

    const accessToken = generateAccessToken(user._id, user.role);
    return ApiResponse.success(res, { accessToken }, 'Access token refreshed.');
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
exports.logout = async (req, res, next) => {
  try {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return ApiResponse.success(res, {}, 'Logged out successfully.');
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('employeeId', 'firstName lastName employeeCode department position salary');

    return ApiResponse.success(res, { user }, 'Profile fetched.');
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return ApiResponse.error(res, 'currentPassword and newPassword are required.', 400);
    }

    if (newPassword.length < 8) {
      return ApiResponse.error(res, 'New password must be at least 8 characters.', 400);
    }

    if (currentPassword === newPassword) {
      return ApiResponse.error(res, 'New password must be different from current password.', 400);
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return ApiResponse.error(res, 'User not found.', 404);
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return ApiResponse.error(res, 'Current password is incorrect.', 400);
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    user.passwordResetByAdmin = false;
    user.passwordResetAt = null;
    user.passwordResetBy = null;
    user.tempPasswordExpiresAt = null;
    await user.save();

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return ApiResponse.success(res, {}, 'Password changed. Please log in with your new password.');
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/link-employee (admin)
exports.linkEmployee = async (req, res, next) => {
  try {
    const { userId, employeeId } = req.body;
    if (!userId || !employeeId) {
      return ApiResponse.error(res, 'userId and employeeId are required.', 400);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { employeeId },
      { new: true }
    ).populate('employeeId', 'firstName lastName employeeCode position');

    if (!user) return ApiResponse.error(res, 'User not found.', 404);

    return ApiResponse.success(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
        },
      },
      'Employee record linked to user account.'
    );
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/users (admin)
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .populate('employeeId', 'firstName lastName employeeCode')
      .sort({ createdAt: -1 });

    return ApiResponse.success(res, { users, total: users.length }, 'Users fetched.');
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/users/:id/toggle (admin)
exports.toggleUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return ApiResponse.error(res, 'User not found.', 404);

    if (String(user._id) === String(req.user._id)) {
      return ApiResponse.error(res, 'You cannot deactivate your own account.', 400);
    }

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    return ApiResponse.success(
      res,
      { id: user._id, email: user.email, isActive: user.isActive },
      `User account ${user.isActive ? 'activated' : 'deactivated'}.`
    );
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/users/:id/reset-password (admin)
exports.resetUserPassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return ApiResponse.error(res, 'User not found.', 404);
    }

    if (String(user._id) === String(req.user._id)) {
      return ApiResponse.error(res, 'You cannot reset your own password from this action.', 400);
    }

    const randomPart = Math.random().toString(36).slice(-6);
    const temporaryPassword = `TH@${randomPart}9`;

    user.password = temporaryPassword;
    user.mustChangePassword = true;
    user.passwordResetByAdmin = true;
    user.passwordResetAt = new Date();
    user.passwordResetBy = req.user._id;
    user.tempPasswordExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await user.save();

    return ApiResponse.success(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          tempPasswordExpiresAt: user.tempPasswordExpiresAt,
        },
        temporaryPassword,
      },
      'Temporary password generated successfully.'
    );
  } catch (error) {
    next(error);
  }
};