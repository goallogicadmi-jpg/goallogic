const AnalystAuditLog = require('../models/AnalystAuditLog');
const logger = require('./logger');

async function logAnalystAudit({ action, analystId, actorId, targetUserId, details, ip }) {
  try {
    await AnalystAuditLog.create({
      action,
      analystId: analystId || null,
      actorId: actorId || null,
      targetUserId: targetUserId || null,
      details: details || {},
      ip: ip || null,
    });
  } catch (err) {
    logger.error('analyst_audit_log_error', { action, message: err.message });
  }
}

module.exports = { logAnalystAudit };
