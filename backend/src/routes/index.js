const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const dc = require('../controllers/departmentController');
const ac = require('../controllers/attendanceController');
const lc = require('../controllers/leaveController');
const kc = require('../controllers/kinController');
const pc = require('../controllers/payrollController');

// ── Department Router ─────────────────────────────────────
const deptRouter = express.Router();
deptRouter.use(protect, authorize('admin'));
deptRouter.get('/',       dc.getDepartments);
deptRouter.post('/',      dc.createDepartment);
deptRouter.get('/:id',    dc.getDepartment);
deptRouter.put('/:id',    dc.updateDepartment);
deptRouter.delete('/:id', dc.deleteDepartment);

// ── Attendance Router ─────────────────────────────────────
const attRouter = express.Router();
attRouter.use(protect);
attRouter.post('/clock-in',     ac.clockIn);
attRouter.post('/clock-out',    ac.clockOut);
attRouter.post('/mark-absent',  authorize('admin'), ac.markAbsent);
attRouter.get('/today',         ac.getToday);
attRouter.get('/history',       ac.getHistory);
attRouter.get('/monthly-pulse', authorize('admin'), ac.getMonthlyPulse);

// ── Leave Router ──────────────────────────────────────────
const leaveRouter = express.Router();
leaveRouter.use(protect);
// Named routes MUST come before /:id
leaveRouter.get('/stats',                          authorize('admin'), lc.getLeaveStats);
leaveRouter.get('/balance',                        authorize('admin'), lc.getAllBalances);
leaveRouter.get('/balance/me',                     lc.getMyBalance);
leaveRouter.get('/balance/:employeeId',            authorize('admin'), lc.getEmployeeBalance);
leaveRouter.put('/balance/:employeeId',            authorize('admin'), lc.adjustBalance);
leaveRouter.post('/',                              lc.applyLeave);
leaveRouter.get('/',                               lc.getLeaves);
leaveRouter.get('/:id',                            lc.getLeave);
leaveRouter.put('/:id/review',                     authorize('admin'), lc.reviewLeave);
leaveRouter.delete('/:id',                         lc.cancelLeave);

// ── Kin Router ────────────────────────────────────────────
const kinRouter = express.Router();
kinRouter.use(protect);
// /me MUST come before /:id and /employee/:employeeId
kinRouter.get('/me', (req, res, next) => {
  if (!req.user.employeeId) {
    return res.status(400).json({ success: false, message: 'Account not linked to an employee record.' });
  }
  req.params.employeeId = req.user.employeeId.toString();
  return kc.getKinByEmployee(req, res, next);
});
kinRouter.get('/',                      authorize('admin'), kc.getKins);
kinRouter.post('/',                     authorize('admin'), kc.createOrUpdateKin);
kinRouter.get('/employee/:employeeId',  authorize('admin'), kc.getKinByEmployee);
kinRouter.delete('/:id',               authorize('admin'), kc.deleteKin);

// ── Payroll Router ────────────────────────────────────────
const payrollRouter = express.Router();
payrollRouter.use(protect);
// /me and /summary MUST come before /:id
payrollRouter.get('/me', (req, res, next) => {
  if (!req.user.employeeId) {
    return res.status(400).json({ success: false, message: 'Account not linked to an employee record.' });
  }
  req.params.employeeId = req.user.employeeId.toString();
  return pc.getEmployeePayroll(req, res, next);
});
payrollRouter.get('/summary',               authorize('admin'), pc.getPayrollSummary);
payrollRouter.get('/employee/:employeeId',  authorize('admin'), pc.getEmployeePayroll);
payrollRouter.post('/generate',             authorize('admin'), pc.generatePayroll);
payrollRouter.get('/',                      authorize('admin'), pc.getPayrolls);
payrollRouter.get('/:id',                   authorize('admin'), pc.getPayroll);
payrollRouter.put('/:id',                   authorize('admin'), pc.updatePayroll);
payrollRouter.put('/:id/mark-paid',         authorize('admin'), pc.markPaid);
payrollRouter.delete('/:id',               authorize('admin'), pc.deletePayroll);

module.exports = { deptRouter, attRouter, leaveRouter, kinRouter, payrollRouter };
