const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    leaveType: {
      type: String,
      enum: ['annual', 'sick', 'maternity', 'paternity', 'unpaid', 'other'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalDays: {
      type: Number,
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    adminNote: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Calculate total days before save
leaveSchema.pre('save', function (next) {
  if (this.startDate && this.endDate) {
    const diff = Math.ceil(
      (this.endDate - this.startDate) / (1000 * 60 * 60 * 24)
    ) + 1;
    this.totalDays = diff > 0 ? diff : 1;
  }
  next();
});

module.exports = mongoose.model('Leave', leaveSchema);
