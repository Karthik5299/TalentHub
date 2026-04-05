const Leave        = require('../models/Leave');
const LeaveBalance = require('../models/LeaveBalance');
const ApiResponse  = require('../utils/apiResponse');
const { emitToAdmins, emitToEmployee, EVENTS } = require('../socket');
const { notifyAllAdmins, notifyEmployee } = require('../utils/notify');

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
const UNLIMITED = ['unpaid', 'other'];

async function checkBalance(employeeId, leaveType, days, year) {
  if (UNLIMITED.includes(leaveType)) return { ok: true };
  const bal = await LeaveBalance.getOrCreate(employeeId, year);
  const remaining = bal.remaining[leaveType] ?? 0;
  if (days > remaining) {
    return { ok: false, remaining, message: `Insufficient ${leaveType} leave balance. You have ${remaining} day(s) remaining.` };
  }
  return { ok: true, remaining };
}

// ─────────────────────────────────────────────────────────
// POST /api/leaves — Apply for leave
// ─────────────────────────────────────────────────────────
exports.applyLeave = async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;

    let employeeId;
    if (req.user.role === 'admin') {
      if (!req.body.employeeId) return ApiResponse.error(res, 'employeeId is required for admin', 400);
      employeeId = req.body.employeeId;
    } else {
      if (!req.user.employeeId) return ApiResponse.error(res, 'Account not linked to employee record', 400);
      employeeId = req.user.employeeId;
    }

    if (!leaveType || !startDate || !endDate || !reason) {
      return ApiResponse.error(res, 'leaveType, startDate, endDate and reason are required', 400);
    }

    const validTypes = ['annual', 'sick', 'maternity', 'paternity', 'unpaid', 'other'];
    if (!validTypes.includes(leaveType)) {
      return ApiResponse.error(res, `leaveType must be one of: ${validTypes.join(', ')}`, 400);
    }

    const start = new Date(startDate);
    const end   = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return ApiResponse.error(res, 'Invalid date format', 400);
    if (end < start) return ApiResponse.error(res, 'endDate cannot be before startDate', 400);

    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const year = start.getFullYear();

    // Check balance
    const balCheck = await checkBalance(employeeId, leaveType, totalDays, year);
    if (!balCheck.ok) return ApiResponse.error(res, balCheck.message, 400);

    // Check overlap
    const overlap = await Leave.findOne({
      employee: employeeId, status: { $ne: 'declined' },
      startDate: { $lte: end }, endDate: { $gte: start },
    });
    if (overlap) return ApiResponse.error(res, 'A leave already exists overlapping these dates', 409);

    // Create leave
    const leave = await Leave.create({ employee: employeeId, leaveType, startDate: start, endDate: end, reason });

    // Increment pending in balance
    if (!UNLIMITED.includes(leaveType)) {
      await LeaveBalance.findOneAndUpdate(
        { employee: employeeId, year },
        { $inc: { [`${leaveType}.pending`]: totalDays } },
        { upsert: true }
      );
    }

    await leave.populate('employee', 'firstName lastName employeeCode');

    // 🔔 Notifications: persist + real-time
    const empName = `${leave.employee.firstName} ${leave.employee.lastName}`;
    notifyAllAdmins({
      type:    'leave_applied',
      title:   'New Leave Request',
      message: `${empName} applied for ${leave.totalDays} day(s) of ${leave.leaveType} leave.`,
      icon:    '✈️',
      link:    '/admin/leaves',
      meta:    { leaveId: leave._id, employeeId: leave.employee._id },
    });

    // 🔌 Real-time: notify all admins instantly
    emitToAdmins(EVENTS.LEAVE_APPLIED, {
      leave: {
        _id:       leave._id,
        leaveType: leave.leaveType,
        totalDays: leave.totalDays,
        startDate: leave.startDate,
        endDate:   leave.endDate,
        status:    leave.status,
        reason:    leave.reason,
        employee:  leave.employee,
      },
    });

    return ApiResponse.success(res, { leave }, 'Leave application submitted', 201);
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// GET /api/leaves — List leaves
// ─────────────────────────────────────────────────────────
exports.getLeaves = async (req, res, next) => {
  try {
    const { status, employeeId, page = 1, limit = 20 } = req.query;
    const query = {};

    if (req.user.role === 'admin') {
      if (employeeId) query.employee = employeeId;
    } else {
      if (!req.user.employeeId) return ApiResponse.paginated(res, [], 0, page, limit, 'No linked employee record');
      query.employee = req.user.employeeId;
    }

    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [leaves, total] = await Promise.all([
      Leave.find(query)
        .populate('employee', 'firstName lastName employeeCode department')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Leave.countDocuments(query),
    ]);

    return ApiResponse.paginated(res, leaves, total, page, limit, 'Leaves fetched');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// GET /api/leaves/:id
// ─────────────────────────────────────────────────────────
exports.getLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeCode')
      .populate('reviewedBy', 'name');

    if (!leave) return ApiResponse.error(res, 'Leave not found', 404);
    if (req.user.role !== 'admin' && String(leave.employee._id) !== String(req.user.employeeId)) {
      return ApiResponse.error(res, 'Not authorised', 403);
    }
    return ApiResponse.success(res, { leave }, 'Leave fetched');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// PUT /api/leaves/:id/review — Admin approve/decline
// ─────────────────────────────────────────────────────────
exports.reviewLeave = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    if (!['approved', 'declined'].includes(status)) {
      return ApiResponse.error(res, "status must be 'approved' or 'declined'", 400);
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) return ApiResponse.error(res, 'Leave not found', 404);
    if (leave.status !== 'pending') {
      return ApiResponse.error(res, `Leave already ${leave.status}`, 400);
    }

    const leaveType  = leave.leaveType;
    const totalDays  = leave.totalDays;
    const year       = new Date(leave.startDate).getFullYear();
    const employeeId = leave.employee;

    leave.status     = status;
    if (adminNote) leave.adminNote = adminNote;
    leave.reviewedBy  = req.user.id;
    leave.reviewedAt  = new Date();
    await leave.save();

    // Update balance
    if (!UNLIMITED.includes(leaveType)) {
      if (status === 'approved') {
        // Move from pending → used
        await LeaveBalance.findOneAndUpdate(
          { employee: employeeId, year },
          { $inc: { [`${leaveType}.pending`]: -totalDays, [`${leaveType}.used`]: totalDays } },
          { upsert: true }
        );
      } else {
        // Declined — release the pending hold
        await LeaveBalance.findOneAndUpdate(
          { employee: employeeId, year },
          { $inc: { [`${leaveType}.pending`]: -totalDays } },
          { upsert: true }
        );
      }
    }

    await leave.populate('employee', 'firstName lastName employeeCode');

    // 🔔 Notify employee
    const isApproved = status === 'approved';
    notifyEmployee(leave.employee._id, {
      type:    isApproved ? 'leave_approved' : 'leave_declined',
      title:   isApproved ? 'Leave Approved ✅' : 'Leave Declined ❌',
      message: isApproved
        ? `Your ${leave.leaveType} leave (${leave.totalDays}d) has been approved.`
        : `Your ${leave.leaveType} leave (${leave.totalDays}d) was declined.${leave.adminNote ? ' Note: ' + leave.adminNote : ''}`,
      icon:    isApproved ? '✅' : '❌',
      link:    '/employee/leaves',
      meta:    { leaveId: leave._id },
    });

    // 🔌 Real-time: notify the employee who owns this leave
    emitToEmployee(leave.employee._id, EVENTS.LEAVE_REVIEWED, {
      leave: {
        _id:       leave._id,
        leaveType: leave.leaveType,
        totalDays: leave.totalDays,
        startDate: leave.startDate,
        endDate:   leave.endDate,
        status:    leave.status,
        adminNote: leave.adminNote,
        employee:  leave.employee,
      },
    });

    // Also refresh admin list (other admin tabs)
    emitToAdmins(EVENTS.LEAVE_REVIEWED, { leaveId: leave._id, status });

    return ApiResponse.success(res, { leave }, `Leave ${status} successfully`);
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// DELETE /api/leaves/:id — Cancel pending leave
// ─────────────────────────────────────────────────────────
exports.cancelLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return ApiResponse.error(res, 'Leave not found', 404);

    if (req.user.role !== 'admin' && String(leave.employee) !== String(req.user.employeeId)) {
      return ApiResponse.error(res, 'Not authorised', 403);
    }
    if (leave.status !== 'pending') return ApiResponse.error(res, 'Only pending leaves can be cancelled', 400);

    const leaveType  = leave.leaveType;
    const totalDays  = leave.totalDays;
    const year       = new Date(leave.startDate).getFullYear();
    const employeeId = leave.employee;

    const leaveId = leave._id;
    await leave.deleteOne();

    // Release the pending hold
    if (!UNLIMITED.includes(leaveType)) {
      await LeaveBalance.findOneAndUpdate(
        { employee: employeeId, year },
        { $inc: { [`${leaveType}.pending`]: -totalDays } },
        { upsert: true }
      );
    }

    // 🔔 Notify admins
    notifyAllAdmins({
      type:    'leave_cancelled',
      title:   'Leave Cancelled',
      message: `An employee cancelled their pending leave request.`,
      icon:    '🚫',
      link:    '/admin/leaves',
      meta:    { leaveId: String(leaveId) },
    });

    // 🔌 Real-time: notify admins of cancellation
    emitToAdmins(EVENTS.LEAVE_CANCELLED, { leaveId: String(leaveId), employeeId: String(employeeId) });

    return ApiResponse.success(res, {}, 'Leave cancelled');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// GET /api/leaves/stats — Admin stats
// ─────────────────────────────────────────────────────────
exports.getLeaveStats = async (req, res, next) => {
  try {
    const raw = await Leave.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const stats = { pending:0, approved:0, declined:0 };
    raw.forEach(s => { stats[s._id] = s.count; });
    return ApiResponse.success(res, { stats, total: stats.pending + stats.approved + stats.declined }, 'Stats fetched');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// GET /api/leaves/balance/me — Employee's own balance
// ─────────────────────────────────────────────────────────
exports.getMyBalance = async (req, res, next) => {
  try {
    if (!req.user.employeeId) return ApiResponse.error(res, 'Account not linked to employee record', 400);
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const balance = await LeaveBalance.getOrCreate(req.user.employeeId, year);
    return ApiResponse.success(res, { balance }, 'Leave balance fetched');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// GET /api/leaves/balance/:employeeId — Admin view any employee's balance
// ─────────────────────────────────────────────────────────
exports.getEmployeeBalance = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const balance = await LeaveBalance.getOrCreate(req.params.employeeId, year);
    return ApiResponse.success(res, { balance }, 'Leave balance fetched');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// PUT /api/leaves/balance/:employeeId — Admin adjust balance
// Body: { leaveType, allocated?, used?, year? }
// ─────────────────────────────────────────────────────────
exports.adjustBalance = async (req, res, next) => {
  try {
    const { leaveType, allocated, year: reqYear } = req.body;
    const year = reqYear || new Date().getFullYear();

    const validTypes = ['annual', 'sick', 'maternity', 'paternity', 'unpaid', 'other'];
    if (!leaveType || !validTypes.includes(leaveType)) {
      return ApiResponse.error(res, `leaveType must be one of: ${validTypes.join(', ')}`, 400);
    }
    if (allocated === undefined || allocated < 0) {
      return ApiResponse.error(res, 'allocated days must be a non-negative number', 400);
    }

    const balance = await LeaveBalance.findOneAndUpdate(
      { employee: req.params.employeeId, year },
      { $set: { [`${leaveType}.allocated`]: parseInt(allocated), lastUpdatedBy: req.user.id } },
      { upsert: true, new: true }
    );

    return ApiResponse.success(res, { balance }, `${leaveType} leave balance updated to ${allocated} days`);
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────────────────
// GET /api/leaves/balance — Admin: all employees' balances
// ─────────────────────────────────────────────────────────
exports.getAllBalances = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const balances = await LeaveBalance.find({ year })
      .populate('employee', 'firstName lastName employeeCode department position')
      .sort({ createdAt: 1 });
    return ApiResponse.success(res, { balances, year }, 'All balances fetched');
  } catch (error) { next(error); }
};
