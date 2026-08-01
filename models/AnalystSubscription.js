const mongoose = require('mongoose');

const analystSubscriptionSchema = new mongoose.Schema(
  {
    subscriberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    analystId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    stripeCustomerId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'incomplete', 'trialing'],
      default: 'active',
      index: true,
    },
    currentPeriodEnd: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

analystSubscriptionSchema.index({ subscriberId: 1, analystId: 1 });

module.exports = mongoose.model('AnalystSubscription', analystSubscriptionSchema);
