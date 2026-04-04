const Kin = require('../models/Kin');
const Employee = require('../models/Employee');
const ApiResponse = require('../utils/apiResponse');

// ─────────────────────────────────────────────
// @desc   Get all kin records + employees missing one
// @route  GET /api/kin
// @access Private — Admin
// ─────────────────────────────────────────────
exports.getKins = async (req, res, next) => {
  try {
    const kins = await Kin.find()
      .populate('employee', 'firstName lastName employeeCode department position')
      .sort({ createdAt: -1 });

    const employeesWithKin = kins.map((k) => k.employee?._id?.toString()).filter(Boolean);
    const missingKin = await Employee.find({
      status: 'active',
      _id: { $nin: employeesWithKin },
    }).select('firstName lastName employeeCode department position');

    return ApiResponse.success(res, { kins, missingKin, missingCount: missingKin.length }, 'Kin records fetched');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────
// @desc   Get kin for a specific employee
// @route  GET /api/kin/employee/:employeeId
// @access Private — Admin
// ─────────────────────────────────────────────
exports.getKinByEmployee = async (req, res, next) => {
  try {
    const kin = await Kin.findOne({ employee: req.params.employeeId })
      .populate('employee', 'firstName lastName employeeCode');
    if (!kin) return ApiResponse.error(res, 'No emergency contact found for this employee', 404);
    return ApiResponse.success(res, { kin }, 'Kin fetched');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────
// @desc   Create or update kin record (upsert)
// @route  POST /api/kin
// @access Private — Admin
// Body:   { employeeId, name, relationship, phone, email?, address? }
// ─────────────────────────────────────────────
exports.createOrUpdateKin = async (req, res, next) => {
  try {
    const { employeeId, name, relationship, phone, email, address } = req.body;

    if (!employeeId || !name || !relationship || !phone) {
      return ApiResponse.error(res, 'employeeId, name, relationship and phone are required', 400);
    }

    const validRelationships = ['spouse', 'parent', 'sibling', 'child', 'friend', 'other'];
    if (!validRelationships.includes(relationship)) {
      return ApiResponse.error(res, `relationship must be one of: ${validRelationships.join(', ')}`, 400);
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) return ApiResponse.error(res, 'Employee not found', 404);

    const kin = await Kin.findOneAndUpdate(
      { employee: employeeId },
      { employee: employeeId, name, relationship, phone, email: email || undefined, address: address || undefined },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    await kin.populate('employee', 'firstName lastName employeeCode');
    return ApiResponse.success(res, { kin }, 'Emergency contact saved');
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────────
// @desc   Delete a kin record by kin _id
// @route  DELETE /api/kin/:id
// @access Private — Admin
// ─────────────────────────────────────────────
exports.deleteKin = async (req, res, next) => {
  try {
    const kin = await Kin.findByIdAndDelete(req.params.id);
    if (!kin) return ApiResponse.error(res, 'Emergency contact not found', 404);
    return ApiResponse.success(res, {}, 'Emergency contact deleted');
  } catch (error) { next(error); }
};
