const mongoose = require('mongoose');

// Default quotas per year (in days)
const DEFAULT_QUOTAS = {
  annual:    12,
  sick:      10,
  maternity: 90,
  paternity:  7,
  unpaid:    999, // unlimited
  other:     999,
};

const leaveBalanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    year: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear(),
    },
    // Each leave type: { allocated, used, pending }
    annual:    { allocated: { type:Number, default:12  }, used: { type:Number, default:0 }, pending: { type:Number, default:0 } },
    sick:      { allocated: { type:Number, default:10  }, used: { type:Number, default:0 }, pending: { type:Number, default:0 } },
    maternity: { allocated: { type:Number, default:90  }, used: { type:Number, default:0 }, pending: { type:Number, default:0 } },
    paternity: { allocated: { type:Number, default:7   }, used: { type:Number, default:0 }, pending: { type:Number, default:0 } },
    unpaid:    { allocated: { type:Number, default:999 }, used: { type:Number, default:0 }, pending: { type:Number, default:0 } },
    other:     { allocated: { type:Number, default:999 }, used: { type:Number, default:0 }, pending: { type:Number, default:0 } },

    // Audit
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// One balance record per employee per year
leaveBalanceSchema.index({ employee: 1, year: 1 }, { unique: true });

// Virtual: remaining per type
leaveBalanceSchema.virtual('remaining').get(function () {
  const types = ['annual','sick','maternity','paternity','unpaid','other'];
  const result = {};
  for (const t of types) {
    const alloc = this[t]?.allocated ?? 0;
    const used  = this[t]?.used  ?? 0;
    const pend  = this[t]?.pending ?? 0;
    result[t] = Math.max(0, alloc - used - pend);
  }
  return result;
});

leaveBalanceSchema.set('toJSON',   { virtuals: true });
leaveBalanceSchema.set('toObject', { virtuals: true });

// ── Static: get or create balance for employee+year ────────
leaveBalanceSchema.statics.getOrCreate = async function (employeeId, year) {
  year = year || new Date().getFullYear();
  let bal = await this.findOne({ employee: employeeId, year });
  if (!bal) {
    bal = await this.create({ employee: employeeId, year });
  }
  return bal;
};

// ── Static: default quotas object ─────────────────────────
leaveBalanceSchema.statics.defaultQuotas = DEFAULT_QUOTAS;

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
