const mongoose = require('mongoose');

const CAMPAIGN_STATUSES = [
  'pending',
  'scheduled',
  'processing',
  'sent',
  'partial',
  'failed',
  'cancelled',
];

const segmentSchema = new mongoose.Schema(
  {
    premium: { type: String, enum: ['all', 'premium', 'free'], default: 'all' },
    pais: { type: String, default: null },
    activity: { type: String, enum: ['all', 'active', 'inactive'], default: 'all' },
    inactiveDays: { type: Number, default: 30, min: 1, max: 365 },
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { _id: false }
);

const statsSchema = new mongoose.Schema(
  {
    targetCount: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const messageCampaignSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'MessageTemplate', default: null },
    titulo: { type: String, required: true, trim: true, maxlength: 200 },
    contenido: { type: String, required: true, trim: true, maxlength: 5000 },
    segment: { type: segmentSchema, default: () => ({}) },
    sendMode: { type: String, enum: ['now', 'scheduled'], default: 'now' },
    scheduledAt: { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: CAMPAIGN_STATUSES,
      default: 'pending',
      index: true,
    },
    batchSize: { type: Number, default: 50, min: 10, max: 200 },
    stats: { type: statsSchema, default: () => ({}) },
    errorLog: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId },
        message: { type: String },
      },
    ],
    note: { type: String, default: '', maxlength: 300 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

messageCampaignSchema.index({ status: 1, scheduledAt: 1 });
messageCampaignSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MessageCampaign', messageCampaignSchema);
module.exports.CAMPAIGN_STATUSES = CAMPAIGN_STATUSES;
