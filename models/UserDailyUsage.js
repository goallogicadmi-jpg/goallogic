const mongoose = require('mongoose');

const userDailyUsageSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    predictions: {
      type: Number,
      default: 0,
      min: 0,
    },
    simulations: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

userDailyUsageSchema.index({ user_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('UserDailyUsage', userDailyUsageSchema);
