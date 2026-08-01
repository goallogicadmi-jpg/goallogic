const mongoose = require('mongoose');

const analystMessageSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    suspended: {
      type: Boolean,
      default: false,
      index: true,
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    suspendedReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: false,
    },
  }
);

analystMessageSchema.index({ analystId: 1, createdAt: -1 });
analystMessageSchema.index({ subscriberId: 1, createdAt: -1 });

module.exports = mongoose.model('AnalystMessage', analystMessageSchema);
