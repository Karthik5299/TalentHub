const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    clockIn: {
      type: Date,
    },
    clockOut: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half-day'],
      default: 'absent',
    },
    workHours: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Compound index: one record per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

// Calculate work hours before save
attendanceSchema.pre('save', function (next) {
  if (this.clockIn && this.clockOut) {
    const diff = (this.clockOut - this.clockIn) / (1000 * 60 * 60);
    this.workHours = parseFloat(diff.toFixed(2));
  }
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);
