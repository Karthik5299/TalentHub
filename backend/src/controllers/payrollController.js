const Payroll    = require('../models/Payroll');
const Employee   = require('../models/Employee');
const Attendance = require('../models/Attendance');
const ApiResponse = require('../utils/apiResponse');
const { emitToEmployee, EVENTS } = require('../socket');
const { notifyEmployee } = require('../utils/notify');

// ─────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────

/** Count working days (Mon–Fri) in a given month/year */
const countWorkingDays = (year, month) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
};

/** Standard Indian payroll deduction calculator */
const calcDeductions = (basicSalary) => {
  const pf  = Math.round(basicSalary * 0.12);          // 12% PF
  const esi = basicSalary <= 21000
    ? Math.round(basicSalary * 0.0075)                  // 0.75% ESI (if eligible)
    : 0;
  // Simple tax slab (annual basic × 12)
  const annual = basicSalary * 12;
  let tax = 0;
  if (annual > 1500000)      tax = Math.round(((annual - 1500000) * 0.30 + 125000) / 12);
  else if (annual > 1200000) tax = Math.round(((annual - 1200000) * 0.20 + 65000)  / 12);
  else if (annual > 900000)  tax = Math.round(((annual - 900000)  * 0.15 + 20000)  / 12);
  else if (annual > 600000)  tax = Math.round(((annual - 600000)  * 0.10 + 5000)   / 12);
  else if (annual > 300000)  tax = Math.round(((annual - 300000)  * 0.05)           / 12);
  return { pf, esi, tax };
};

// ─────────────────────────────────────────────────────────
// POST /api/payroll/generate
// Generate payroll for one employee OR all active employees
// for a given month + year.  Skips if record already exists.
// Body: { month, year, employeeId? }
// ─────────────────────────────────────────────────────────
exports.generatePayroll = async (req, res, next) => {
  try {
    const { month, year, employeeId } = req.body;

    if (!month || !year) {
      return ApiResponse.error(res, 'month and year are required.', 400);
    }
    if (month < 1 || month > 12) {
      return ApiResponse.error(res, 'month must be between 1 and 12.', 400);
    }

    // Determine employees to process
    const empQuery = { status: 'active' };
    if (employeeId) empQuery._id = employeeId;
    const employees = await Employee.find(empQuery);

    if (employees.length === 0) {
      return ApiResponse.error(res, 'No active employees found.', 404);
    }

    const workingDays = countWorkingDays(year, month);
    const monthStart  = new Date(year, month - 1, 1);
    const monthEnd    = new Date(year, month, 0, 23, 59, 59);

    const generated = [];
    const skipped   = [];

    for (const emp of employees) {
      // Skip if already exists for this month/year
      const existing = await Payroll.findOne({ employee: emp._id, month, year });
      if (existing) {
        skipped.push({ employeeId: emp._id, name: `${emp.firstName} ${emp.lastName}`, reason: 'Already generated' });
        continue;
      }

      // Pull attendance for this month
      const attRecords = await Attendance.find({
        employee: emp._id,
        date: { $gte: monthStart, $lte: monthEnd },
      });

      const presentDays = attRecords.filter(r => ['present', 'late'].includes(r.status)).length;
      const lateDays    = attRecords.filter(r => r.status === 'late').length;
      const absentDays  = workingDays - presentDays;

      // Per-day salary rate
      const perDay      = emp.salary / workingDays;
      const basicSalary = Math.round(perDay * presentDays);

      // Standard allowances (40% HRA, 10% TA, 5% Medical of basic)
      const hra              = Math.round(basicSalary * 0.40);
      const travelAllowance  = Math.round(basicSalary * 0.10);
      const medicalAllowance = Math.round(basicSalary * 0.05);

      const { pf, esi, tax } = calcDeductions(basicSalary);

      // Late penalty: 0.5 day per 3 late days
      const latePenalty = lateDays >= 3 ? Math.round((perDay * 0.5) * Math.floor(lateDays / 3)) : 0;

      const record = await Payroll.create({
        employee:         emp._id,
        month,
        year,
        basicSalary,
        hra,
        travelAllowance,
        medicalAllowance,
        bonus:            0,
        otherAllowances:  0,
        pfDeduction:      pf,
        esiDeduction:     esi,
        taxDeduction:     tax,
        loanDeduction:    0,
        leaveDeduction:   latePenalty,
        otherDeductions:  0,
        workingDays,
        presentDays,
        absentDays,
        lateDays,
        status:           'generated',
        generatedBy:      req.user._id,
      });

      generated.push(record);
    }

    // 🔔 Notify each employee their payslip is ready
    const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

    for (const record of generated) {
      if (record.employee) {
        notifyEmployee(record.employee, {
          type:    'payroll_generated',
          title:   'Payslip Ready 💰',
          message: `Your payslip for ${MONTHS[record.month]} ${record.year} is ready. Net: ₹${Number(record.netSalary || 0).toLocaleString('en-IN')}.`,
          icon:    '💰',
          link:    '/employee/payslips',
          meta:    { month: record.month, year: record.year, netSalary: record.netSalary },
        });
      }
    }

    // 🔌 Real-time — notify each employee their payslip is ready
    for (const record of generated) {
      if (record.employee) {
        emitToEmployee(record.employee, EVENTS.PAYROLL_GENERATED, {
          month: record.month,
          year:  record.year,
          netSalary: record.netSalary,
        });
      }
    }

    return ApiResponse.success(res, {
      generated: generated.length,
      skipped:   skipped.length,
      skippedList: skipped,
      records:   generated,
    }, `Payroll generated for ${generated.length} employee(s).`, 201);
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// GET /api/payroll
// List payroll records — paginated
// Query: month, year, employeeId, status, page, limit
// ─────────────────────────────────────────────────────────
exports.getPayrolls = async (req, res, next) => {
  try {
    const { month, year, employeeId, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (month)      query.month    = parseInt(month);
    if (year)       query.year     = parseInt(year);
    if (employeeId) query.employee = employeeId;
    if (status)     query.status   = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      Payroll.find(query)
        .populate('employee', 'firstName lastName employeeCode department position')
        .populate('generatedBy', 'name email')
        .sort({ year: -1, month: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Payroll.countDocuments(query),
    ]);

    return ApiResponse.paginated(res, records, total, page, limit, 'Payroll records fetched.');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// GET /api/payroll/summary
// Monthly payroll summary (totals per month for chart)
// Query: year (defaults to current year)
// ─────────────────────────────────────────────────────────
exports.getPayrollSummary = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const summary = await Payroll.aggregate([
      { $match: { year } },
      {
        $group: {
          _id:             '$month',
          totalGross:      { $sum: '$grossSalary' },
          totalNet:        { $sum: '$netSalary' },
          totalDeductions: { $sum: '$totalDeductions' },
          headcount:       { $sum: 1 },
          paid:            { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
          pending:         { $sum: { $cond: [{ $ne:  ['$status', 'paid'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          month:           '$_id',
          totalGross:      1,
          totalNet:        1,
          totalDeductions: 1,
          headcount:       1,
          paid:            1,
          pending:         1,
          _id:             0,
        },
      },
    ]);

    // Overall totals for the year
    const yearTotals = summary.reduce(
      (acc, m) => ({
        grossSalary:    acc.grossSalary    + m.totalGross,
        netSalary:      acc.netSalary      + m.totalNet,
        totalDeductions: acc.totalDeductions + m.totalDeductions,
      }),
      { grossSalary: 0, netSalary: 0, totalDeductions: 0 }
    );

    return ApiResponse.success(res, { year, summary, yearTotals }, 'Payroll summary fetched.');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// GET /api/payroll/:id
// Get a single payroll record
// ─────────────────────────────────────────────────────────
exports.getPayroll = async (req, res, next) => {
  try {
    const record = await Payroll.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeCode department position salary')
      .populate('generatedBy', 'name email');

    if (!record) return ApiResponse.error(res, 'Payroll record not found.', 404);
    return ApiResponse.success(res, { payroll: record }, 'Payroll record fetched.');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// PUT /api/payroll/:id
// Update a DRAFT payroll (adjust bonus, deductions, notes)
// ─────────────────────────────────────────────────────────
exports.updatePayroll = async (req, res, next) => {
  try {
    const record = await Payroll.findById(req.params.id);
    if (!record) return ApiResponse.error(res, 'Payroll record not found.', 404);
    if (record.status === 'paid') {
      return ApiResponse.error(res, 'Cannot edit a payroll that has already been paid.', 400);
    }

    // Only allow updating certain fields
    const allowed = [
      'bonus', 'otherAllowances', 'hra', 'travelAllowance', 'medicalAllowance',
      'pfDeduction', 'esiDeduction', 'taxDeduction', 'loanDeduction',
      'leaveDeduction', 'otherDeductions', 'notes', 'paymentMethod',
    ];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) record[field] = req.body[field];
    });

    await record.save(); // triggers pre-save recalculation
    await record.populate('employee', 'firstName lastName employeeCode');
    return ApiResponse.success(res, { payroll: record }, 'Payroll updated.');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// PUT /api/payroll/:id/mark-paid
// Mark a payroll record as paid
// Body: { paymentMethod?, paidAt? }
// ─────────────────────────────────────────────────────────
exports.markPaid = async (req, res, next) => {
  try {
    const record = await Payroll.findById(req.params.id);
    if (!record) return ApiResponse.error(res, 'Payroll record not found.', 404);
    if (record.status === 'paid') {
      return ApiResponse.error(res, 'Payroll is already marked as paid.', 400);
    }

    record.status        = 'paid';
    record.paidAt        = req.body.paidAt ? new Date(req.body.paidAt) : new Date();
    record.paymentMethod = req.body.paymentMethod || record.paymentMethod;
    await record.save();
    await record.populate('employee', 'firstName lastName employeeCode');

    return ApiResponse.success(res, { payroll: record }, 'Payroll marked as paid.');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// DELETE /api/payroll/:id
// Delete a DRAFT payroll record (cannot delete paid)
// ─────────────────────────────────────────────────────────
exports.deletePayroll = async (req, res, next) => {
  try {
    const record = await Payroll.findById(req.params.id);
    if (!record) return ApiResponse.error(res, 'Payroll record not found.', 404);
    if (record.status === 'paid') {
      return ApiResponse.error(res, 'Cannot delete a paid payroll record.', 400);
    }

    await record.deleteOne();
    return ApiResponse.success(res, {}, 'Payroll record deleted.');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// GET /api/payroll/employee/:employeeId
// All payroll records for one employee
// ─────────────────────────────────────────────────────────
exports.getEmployeePayroll = async (req, res, next) => {
  try {
    const { page = 1, limit = 24 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [records, total] = await Promise.all([
      Payroll.find({ employee: req.params.employeeId })
        .populate('employee', 'firstName lastName employeeCode position')
        .sort({ year: -1, month: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Payroll.countDocuments({ employee: req.params.employeeId }),
    ]);

    return ApiResponse.paginated(res, records, total, page, limit, 'Employee payroll history fetched.');
  } catch (error) { next(error); }
};
