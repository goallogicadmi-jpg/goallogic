const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    url: { type: String, trim: true, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const historySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['submitted', 'approved', 'rejected', 'note'],
      required: true,
    },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, trim: true, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const analystVerificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    documents: [documentSchema],
    notes: { type: String, trim: true, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    history: [historySchema],
  },
  { timestamps: true }
);

analystVerificationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('AnalystVerification', analystVerificationSchema);
