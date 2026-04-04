const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    // Earnings
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    hra: {              // House Rent Allowance
      type: Number,
      default: 0,
    },
    travelAllowance: {
      type: Number,
      default: 0,
    },
    medicalAllowance: {
      type: Number,
      default: 0,
    },
    bonus: {
      type: Number,
      default: 0,
    },
    otherAllowances: {
      type: Number,
      default: 0,
    },
    grossSalary: {
      type: Number,
    },
    // Deductions
    pfDeduction: {      // Provident Fund (12% of basic)
      type: Number,
      default: 0,
    },
    esiDeduction: {     // Employee State Insurance
      type: Number,
      default: 0,
    },
    taxDeduction: {     // TDS
      type: Number,
      default: 0,
    },
    loanDeduction: {
      type: Number,
      default: 0,
    },
    leaveDeduction: {   // Deduction for unpaid leaves
      type: Number,
      default: 0,
    },
    otherDeductions: {
      type: Number,
      default: 0,
    },
    totalDeductions: {
      type: Number,
    },
    // Net
    netSalary: {
      type: Number,
    },
    // Attendance summary for the month
    workingDays: {
      type: Number,
      default: 0,
    },
    presentDays: {
      type: Number,
      default: 0,
    },
    absentDays: {
      type: Number,
      default: 0,
    },
    lateDays: {
      type: Number,
      default: 0,
    },
    // Status
    status: {
      type: String,
      enum: ['draft', 'generated', 'paid'],
      default: 'draft',
    },
    paidAt: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'cash', 'cheque'],
      default: 'bank_transfer',
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// One payroll record per employee per month/year
payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ year: 1, month: 1 });
payrollSchema.index({ status: 1 });

// Auto-calculate totals before save
payrollSchema.pre('save', function (next) {
  this.grossSalary =
    (this.basicSalary || 0) +
    (this.hra || 0) +
    (this.travelAllowance || 0) +
    (this.medicalAllowance || 0) +
    (this.bonus || 0) +
    (this.otherAllowances || 0);

  this.totalDeductions =
    (this.pfDeduction || 0) +
    (this.esiDeduction || 0) +
    (this.taxDeduction || 0) +
    (this.loanDeduction || 0) +
    (this.leaveDeduction || 0) +
    (this.otherDeductions || 0);

  this.netSalary = this.grossSalary - this.totalDeductions;
  next();
});

module.exports = mongoose.model('Payroll', payrollSchema);
