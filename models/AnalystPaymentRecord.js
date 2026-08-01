const mongoose = require('mongoose');

const analystPaymentRecordSchema = new mongoose.Schema(
  {
    analystId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subscriberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    stripeInvoiceId: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    stripeSubscriptionId: {
      type: String,
      trim: true,
      default: null,
    },
    amountCents: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      trim: true,
      default: 'eur',
    },
    status: {
      type: String,
      enum: ['paid', 'failed', 'refunded'],
      default: 'paid',
      index: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

analystPaymentRecordSchema.index({ analystId: 1, paidAt: -1 });

module.exports = mongoose.model('AnalystPaymentRecord', analystPaymentRecordSchema);
