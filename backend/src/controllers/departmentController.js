const Department = require('../models/Department');
const Employee   = require('../models/Employee');
const ApiResponse = require('../utils/apiResponse');

exports.getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find()
      .populate('manager', 'firstName lastName employeeCode position')
      .populate('employeeCount')
      .sort({ name: 1 });
    return ApiResponse.success(res, { departments, total: departments.length }, 'Departments fetched.');
  } catch (error) { next(error); }
};

exports.getDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findById(req.params.id)
      .populate('manager', 'firstName lastName employeeCode position');
    if (!dept) return ApiResponse.error(res, 'Department not found.', 404);
    const employees = await Employee.find({ department: req.params.id, status: 'active' })
      .select('firstName lastName position employeeCode salary joiningDate')
      .sort({ firstName: 1 });
    return ApiResponse.success(res, { department: dept, employees, headcount: employees.length }, 'Department fetched.');
  } catch (error) { next(error); }
};

exports.createDepartment = async (req, res, next) => {
  try {
    const { name, code, description, manager } = req.body;
    if (!name || !name.trim()) return ApiResponse.error(res, 'Department name is required.', 400);

    const existing = await Department.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (existing) return ApiResponse.error(res, `Department "${name}" already exists.`, 400);

    if (code) {
      const dupCode = await Department.findOne({ code: code.toUpperCase().trim() });
      if (dupCode) return ApiResponse.error(res, `Code "${code.toUpperCase()}" already in use.`, 400);
    }

    if (manager) {
      const emp = await Employee.findById(manager);
      if (!emp) return ApiResponse.error(res, 'Manager employee not found.', 404);
    }

    const dept = await Department.create({ name: name.trim(), code, description, manager });
    await dept.populate('manager', 'firstName lastName employeeCode');
    return ApiResponse.success(res, { department: dept }, 'Department created.', 201);
  } catch (error) { next(error); }
};

exports.updateDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return ApiResponse.error(res, 'Department not found.', 404);

    const { name, code, description, manager, isActive } = req.body;

    if (name && name.trim() !== dept.name) {
      const dup = await Department.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' }, _id: { $ne: req.params.id } });
      if (dup) return ApiResponse.error(res, `Department name "${name}" already in use.`, 400);
    }
    if (code && code.toUpperCase() !== dept.code) {
      const dupCode = await Department.findOne({ code: code.toUpperCase(), _id: { $ne: req.params.id } });
      if (dupCode) return ApiResponse.error(res, `Code "${code.toUpperCase()}" already in use.`, 400);
    }
    if (manager) {
      const emp = await Employee.findById(manager);
      if (!emp) return ApiResponse.error(res, 'Manager employee not found.', 404);
    }

    if (name        !== undefined) dept.name        = name.trim();
    if (code        !== undefined) dept.code        = code;
    if (description !== undefined) dept.description = description;
    if (manager     !== undefined) dept.manager     = manager;
    if (isActive    !== undefined) dept.isActive    = isActive;

    await dept.save();
    await dept.populate('manager', 'firstName lastName employeeCode');
    return ApiResponse.success(res, { department: dept }, 'Department updated.');
  } catch (error) { next(error); }
};

exports.deleteDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return ApiResponse.error(res, 'Department not found.', 404);
    const activeCount = await Employee.countDocuments({ department: req.params.id, status: 'active' });
    if (activeCount > 0) {
      return ApiResponse.error(res, `Cannot delete — ${activeCount} active employee(s) in this department. Reassign first.`, 400);
    }
    await dept.deleteOne();
    return ApiResponse.success(res, {}, 'Department deleted.');
  } catch (error) { next(error); }
};
