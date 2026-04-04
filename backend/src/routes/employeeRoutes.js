const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');
const { validate, employeeRules } = require('../middleware/validate');

// ── Employee can view their own record (must come before admin middleware) ──
router.get('/me/profile', protect, async (req, res, next) => {
  // Proxy to getEmployeeProfile using the linked employeeId
  if (!req.user.employeeId) {
    return res.status(400).json({ success: false, message: 'Account not linked to an employee record.' });
  }
  req.params.id = req.user.employeeId.toString();
  return ctrl.getEmployeeProfile(req, res, next);
});

router.get('/me', protect, async (req, res, next) => {
  if (!req.user.employeeId) {
    return res.status(400).json({ success: false, message: 'Account not linked to an employee record.' });
  }
  req.params.id = req.user.employeeId.toString();
  return ctrl.getEmployee(req, res, next);
});

// ── Admin-only routes ──────────────────────────────────────
router.use(protect, authorize('admin'));

// Named routes MUST come before /:id
router.get('/stats',         ctrl.getStats);
router.get('/',              ctrl.getEmployees);
router.post('/',             employeeRules, validate, ctrl.createEmployee);
router.get('/:id/profile',   ctrl.getEmployeeProfile);
router.get('/:id',           ctrl.getEmployee);
router.put('/:id',           ctrl.updateEmployee);
router.delete('/:id',        ctrl.deleteEmployee);

module.exports = router;
