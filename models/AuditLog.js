const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    message: { type: String, required: true, index: true },
    level: { type: String, required: true, index: true },
    module: {
      type: String,
      required: true,
      enum: ['webhook', 'auth', 'premium', 'moderation', 'admin', 'error', 'system'],
      index: true,
    },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    actorId: { type: String, default: null, index: true },
    targetUserId: { type: String, default: null, index: true },
    email: { type: String, default: null },
    ip: { type: String, default: null },
    endpoint: { type: String, default: null },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { collection: 'audit_logs' }
);

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ module: 1, timestamp: -1 });
auditLogSchema.index({ message: 'text', 'payload.note': 'text' });

module.exports = mongoose.model('AuditLog', auditLogSchema);
