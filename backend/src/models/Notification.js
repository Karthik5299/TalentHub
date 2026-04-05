const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Who receives this notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Role-based broadcast (null = specific user only)
    recipientRole: {
      type: String,
      enum: ['admin', 'employee', null],
      default: null,
    },

    type: {
      type: String,
      enum: [
        'leave_applied',
        'leave_approved',
        'leave_declined',
        'leave_cancelled',
        'payroll_generated',
        'payroll_paid',
        'clock_in',
        'clock_out',
        'employee_joined',
        'password_reset',
        'general',
      ],
      required: true,
    },

    title:   { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    // Optional link to navigate on click
    link: { type: String, default: null },

    // Optional icon emoji
    icon: { type: String, default: '🔔' },

    isRead: { type: Boolean, default: false, index: true },

    // Extra metadata (leaveId, employeeId, etc.)
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', notificationSchema);
