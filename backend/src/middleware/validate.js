const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');

// Run validation results and return errors if any
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return ApiResponse.error(res, 'Validation failed', 422, errorMessages);
  }
  next();
};

const { body } = require('express-validator');

// NOTE: We do NOT use normalizeEmail() — it mutates domain-specific addresses
exports.registerRules = [
  body('name').trim().notEmpty().withMessage('name is required').isLength({ min: 2, max: 50 }),
  body('email').trim().isEmail().withMessage('Valid email is required').toLowerCase(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must have at least one uppercase letter, one lowercase letter and one number'),
  body('role').optional().isIn(['admin', 'employee']).withMessage('role must be admin or employee'),
  body('employeeId').optional().isMongoId().withMessage('employeeId must be a valid MongoDB ObjectId'),
];

exports.loginRules = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

exports.employeeRules = [
  body('firstName').trim().notEmpty().withMessage('firstName is required'),
  body('lastName').trim().notEmpty().withMessage('lastName is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('department').notEmpty().isMongoId().withMessage('department must be a valid ObjectId'),
  body('position').trim().notEmpty().withMessage('position is required'),
  body('salary').isNumeric().withMessage('salary must be a number').isFloat({ min: 0 }).withMessage('salary cannot be negative'),
  body('joiningDate').optional().isISO8601().withMessage('joiningDate must be a valid date'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('status must be active or inactive'),
];
