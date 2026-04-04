const Employee  = require('../models/Employee');
const User      = require('../models/User');
const Attendance= require('../models/Attendance');
const Leave     = require('../models/Leave');
const Payroll   = require('../models/Payroll');
const ApiResponse   = require('../utils/apiResponse');
const LeaveBalance  = require('../models/LeaveBalance');

// ─────────────────────────────────────────────────────────
// GET /api/employees         — paginated, searchable
// Query: page, limit, search, department, status
// ─────────────────────────────────────────────────────────
exports.getEmployees = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, department, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { firstName:    { $regex: search, $options: 'i' } },
        { lastName:     { $regex: search, $options: 'i' } },
        { email:        { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } },
        { position:     { $regex: search, $options: 'i' } },
      ];
    }
    if (department) query.department = department;
    if (status)     query.status     = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [employees, total] = await Promise.all([
      Employee.find(query)
        .populate('department', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Employee.countDocuments(query),
    ]);

    return ApiResponse.paginated(res, employees, total, page, limit, 'Employees fetched.');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// GET /api/employees/stats   — dashboard aggregates
// ─────────────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const [total, active, terminated, byDept, payrollAgg, recentHires] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ status: 'active' }),
      Employee.countDocuments({ status: 'terminated' }),
      Employee.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
        { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, name: { $ifNull: ['$dept.name', 'Unknown'] }, code: '$dept.code', count: 1 } },
        { $sort: { count: -1 } },
      ]),
      Employee.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$salary' }, avg: { $avg: '$salary' }, max: { $max: '$salary' }, min: { $min: '$salary' } } },
      ]),
      Employee.find({ status: 'active' })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('department', 'name code'),
    ]);

    const payroll = payrollAgg[0] || { total: 0, avg: 0, max: 0, min: 0 };

    return ApiResponse.success(res, {
      total,
      active,
      inactive:   total - active - terminated,
      terminated,
      byDepartment: byDept,
      payroll: {
        monthlyTotal:    Math.round(payroll.total),
        annualProjection:Math.round(payroll.total * 12),
        averageSalary:   Math.round(payroll.avg || 0),
        highestSalary:   payroll.max || 0,
        lowestSalary:    payroll.min || 0,
      },
      recentHires,
    }, 'Stats fetched.');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// GET /api/employees/:id
// ─────────────────────────────────────────────────────────
exports.getEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('department', 'name code description');
    if (!employee) return ApiResponse.error(res, 'Employee not found.', 404);

    // Also fetch linked user account if exists
    const userAccount = await User.findOne({ employeeId: req.params.id })
      .select('name email role isActive lastLogin');

    return ApiResponse.success(res, { employee, userAccount }, 'Employee fetched.');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// POST /api/employees        — onboard
// Body: firstName, lastName, email, department, position, salary
//       phone?, joiningDate?, status?, address?
// ─────────────────────────────────────────────────────────
exports.createEmployee = async (req, res, next) => {
  try {
    const { firstName, lastName, email, department, position, salary } = req.body;

    if (!firstName || !lastName || !email || !department || !position || salary === undefined) {
      return ApiResponse.error(res, 'firstName, lastName, email, department, position and salary are required.', 400);
    }

    const existing = await Employee.findOne({ email: email.toLowerCase().trim() });
    if (existing) return ApiResponse.error(res, 'An employee with this email already exists.', 400);

    const employee = await Employee.create(req.body);
    await employee.populate('department', 'name code');

    // Auto-create leave balance for current year
    await LeaveBalance.getOrCreate(employee._id, new Date().getFullYear());

    return ApiResponse.success(res, { employee }, 'Employee onboarded successfully.', 201);
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// PUT /api/employees/:id
// ─────────────────────────────────────────────────────────
exports.updateEmployee = async (req, res, next) => {
  try {
    delete req.body.employeeCode; // immutable
    delete req.body.email;        // change via separate flow if needed

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('department', 'name code');

    if (!employee) return ApiResponse.error(res, 'Employee not found.', 404);
    return ApiResponse.success(res, { employee }, 'Employee updated.');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// DELETE /api/employees/:id  — soft offboard (status=terminated)
// ─────────────────────────────────────────────────────────
exports.deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { status: 'terminated' },
      { new: true }
    );
    if (!employee) return ApiResponse.error(res, 'Employee not found.', 404);

    // Deactivate linked user account
    await User.findOneAndUpdate({ employeeId: req.params.id }, { isActive: false });

    return ApiResponse.success(res, { employee: { id: employee._id, employeeCode: employee.employeeCode, status: employee.status } }, 'Employee offboarded.');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// GET /api/employees/:id/profile   — full profile
// Returns employee + attendance summary + leave summary + last payslip
// ─────────────────────────────────────────────────────────
exports.getEmployeeProfile = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('department', 'name code');
    if (!employee) return ApiResponse.error(res, 'Employee not found.', 404);

    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [attStats, leaveStats, lastPayslip, userAccount] = await Promise.all([
      // This month attendance
      Attendance.aggregate([
        { $match: { employee: employee._id, date: { $gte: monthStart, $lte: monthEnd } } },
        { $group: {
          _id: null,
          present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
          absent:  { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          late:    { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          totalHours: { $sum: '$workHours' },
        }},
      ]),
      // Leave summary
      Leave.aggregate([
        { $match: { employee: employee._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Last payslip
      Payroll.findOne({ employee: employee._id }).sort({ year: -1, month: -1 }),
      // Linked user
      User.findOne({ employeeId: employee._id }).select('email role isActive lastLogin'),
    ]);

    const leaveSummary = { pending: 0, approved: 0, declined: 0 };
    leaveStats.forEach(s => { leaveSummary[s._id] = s.count; });

    return ApiResponse.success(res, {
      employee,
      userAccount,
      thisMonthAttendance: attStats[0] || { present: 0, absent: 0, late: 0, totalHours: 0 },
      leaveSummary,
      lastPayslip,
    }, 'Employee profile fetched.');
  } catch (error) { next(error); }
};
