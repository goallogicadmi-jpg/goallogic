const mongoose = require('mongoose');

const systemSettingRevisionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, index: true },
    previousValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorEmail: { type: String, default: null },
    note: { type: String, default: '' },
    batchId: { type: String, index: true },
  },
  { timestamps: true, collection: 'system_setting_revisions' }
);

systemSettingRevisionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SystemSettingRevision', systemSettingRevisionSchema);
