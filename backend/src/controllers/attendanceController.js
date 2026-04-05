const Attendance = require('../models/Attendance');
const Employee   = require('../models/Employee');
const ApiResponse = require('../utils/apiResponse');
const { emitToAdmins, EVENTS } = require('../socket');
const { notifyAllAdmins } = require('../utils/notify');

// ─────────────────────────────────────────────
// @desc   Clock in
// @route  POST /api/attendance/clock-in
// @access Private
// Body:   { employeeId } — admin can pass any; employee uses own linked record
// ─────────────────────────────────────────────
exports.clockIn = async (req, res, next) => {
  try {
    let employeeId;

    if (req.user.role === 'admin') {
      if (!req.body.employeeId) return ApiResponse.error(res, 'employeeId is required', 400);
      employeeId = req.body.employeeId;
    } else {
      if (!req.user.employeeId) {
        return ApiResponse.error(res, 'Your account is not linked to an employee record', 400);
      }
      employeeId = req.user.employeeId;
    }

    // Verify employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) return ApiResponse.error(res, 'Employee not found', 404);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await Attendance.findOne({ employee: employeeId, date: today });
    if (existing && existing.clockIn) {
      return ApiResponse.error(res, `${employee.firstName} has already clocked in today`, 400);
    }

    const now = new Date();
    // Late if after 09:15
    const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15);

    const attendance = await Attendance.findOneAndUpdate(
      { employee: employeeId, date: today },
      { clockIn: now, status: isLate ? 'late' : 'present' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await attendance.populate('employee', 'firstName lastName employeeCode department position');

    // 🔔 Notify admins
    const ciName = `${attendance.employee.firstName} ${attendance.employee.lastName}`;
    notifyAllAdmins({
      type:    'clock_in',
      title:   'Employee Clocked In',
      message: `${ciName} clocked in at ${new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}${isLate ? ' (late)' : ''}.`,
      icon:    '🟢',
      link:    '/admin/attendance',
      meta:    { employeeId: attendance.employee._id, status: attendance.status },
    });

    // 🔌 Real-time: notify admins
    emitToAdmins(EVENTS.CLOCK_IN, {
      attendance: {
        _id:       attendance._id,
        employee:  attendance.employee,
        clockIn:   attendance.clockIn,
        status:    attendance.status,
        date:      attendance.date,
      },
    });

    return ApiResponse.success(res, { attendance }, `${employee.firstName} clocked in${isLate ? ' (late)' : ''}`, 201);
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────
// @desc   Clock out
// @route  POST /api/attendance/clock-out
// @access Private
// Body:   { employeeId } — admin can pass any; employee uses own
// ─────────────────────────────────────────────
exports.clockOut = async (req, res, next) => {
  try {
    let employeeId;

    if (req.user.role === 'admin') {
      if (!req.body.employeeId) return ApiResponse.error(res, 'employeeId is required', 400);
      employeeId = req.body.employeeId;
    } else {
      if (!req.user.employeeId) return ApiResponse.error(res, 'Account not linked to employee record', 400);
      employeeId = req.user.employeeId;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({ employee: employeeId, date: today });
    if (!attendance || !attendance.clockIn) {
      return ApiResponse.error(res, 'No clock-in record found for today', 404);
    }
    if (attendance.clockOut) {
      return ApiResponse.error(res, 'Already clocked out today', 400);
    }

    attendance.clockOut = new Date();
    await attendance.save();
    await attendance.populate('employee', 'firstName lastName employeeCode');

    // 🔔 Notify admins
    const coName = `${attendance.employee.firstName} ${attendance.employee.lastName}`;
    notifyAllAdmins({
      type:    'clock_out',
      title:   'Employee Clocked Out',
      message: `${coName} clocked out. Hours worked: ${attendance.workHours || '—'}h.`,
      icon:    '🔴',
      link:    '/admin/attendance',
      meta:    { employeeId: attendance.employee._id, workHours: attendance.workHours },
    });

    // 🔌 Real-time: notify admins
    emitToAdmins(EVENTS.CLOCK_OUT, {
      attendance: {
        _id:      attendance._id,
        employee: attendance.employee,
        clockOut: attendance.clockOut,
        workHours:attendance.workHours,
        status:   attendance.status,
        date:     attendance.date,
      },
    });

    return ApiResponse.success(res, { attendance }, 'Clocked out successfully');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────
// @desc   Today's attendance — live tracking
// @route  GET /api/attendance/today
// @access Private
// ─────────────────────────────────────────────
exports.getToday = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = { date: today };

    // Employees see only their own record
    if (req.user.role !== 'admin') {
      if (!req.user.employeeId) return ApiResponse.success(res, { records: [], activeStaff: [], completed: [], stats: {} }, 'No linked employee');
      query.employee = req.user.employeeId;
    }

    const records = await Attendance.find(query)
      .populate('employee', 'firstName lastName employeeCode department position')
      .sort({ clockIn: 1 });

    const activeStaff = records.filter((r) => r.clockIn && !r.clockOut);
    const completed   = records.filter((r) => r.clockIn && r.clockOut);
    const totalActive = await Employee.countDocuments({ status: 'active' });
    const present     = records.filter((r) => ['present', 'late'].includes(r.status)).length;

    return ApiResponse.success(res, {
      records,
      activeStaff,
      completed,
      stats: {
        totalEmployees: totalActive,
        present,
        absent: totalActive - present,
        attendanceRate: totalActive > 0 ? Math.round((present / totalActive) * 100) : 0,
      },
    }, "Today's attendance fetched");
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────
// @desc   Attendance history (paginated)
// @route  GET /api/attendance/history
// @access Private
// Query:  employeeId (admin), startDate, endDate, page, limit
// ─────────────────────────────────────────────
exports.getHistory = async (req, res, next) => {
  try {
    const { employeeId, startDate, endDate, page = 1, limit = 30 } = req.query;
    const query = {};

    if (req.user.role === 'admin') {
      if (employeeId) query.employee = employeeId;
    } else {
      if (!req.user.employeeId) return ApiResponse.paginated(res, [], 0, page, limit);
      query.employee = req.user.employeeId;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate)   query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate('employee', 'firstName lastName employeeCode')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Attendance.countDocuments(query),
    ]);

    return ApiResponse.paginated(res, records, total, page, limit, 'Attendance history fetched');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────
// @desc   Monthly attendance pulse (for dashboard chart)
// @route  GET /api/attendance/monthly-pulse
// @access Private — Admin
// Query:  year, month (1–12, defaults to current)
// ─────────────────────────────────────────────
exports.getMonthlyPulse = async (req, res, next) => {
  try {
    const now = new Date();
    const year  = parseInt(req.query.year)  || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);

    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);

    const pulse = await Attendance.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
          late:    { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          absent:  { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return ApiResponse.success(res, { year, month, pulse }, 'Monthly pulse fetched');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────
// @desc   Manually mark an employee absent (admin)
// @route  POST /api/attendance/mark-absent
// @access Private — Admin
// Body:   { employeeId, date? }
// ─────────────────────────────────────────────
exports.markAbsent = async (req, res, next) => {
  try {
    const { employeeId, date } = req.body;
    if (!employeeId) return ApiResponse.error(res, 'employeeId is required', 400);

    const target = date ? new Date(date) : new Date();
    target.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOneAndUpdate(
      { employee: employeeId, date: target },
      { status: 'absent', clockIn: null, clockOut: null },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await attendance.populate('employee', 'firstName lastName employeeCode');
    return ApiResponse.success(res, { attendance }, 'Marked as absent');
  } catch (error) { next(error); }
};
