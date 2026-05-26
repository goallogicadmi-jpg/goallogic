const logger = require('./logger');

/**
 * Registro unificado de acciones de moderación (Winston).
 */
function logModerationAction(action, req, payload = {}) {
  logger.info('admin_moderation_action', {
    action,
    actorId: req?.user?.id ? String(req.user.id) : null,
    ip: req?.ip || null,
    endpoint: req ? `${req.method} ${req.baseUrl}${req.path}` : null,
    ...payload,
  });
}

/**
 * @param {import('../models/User')} user
 */
function isUserCommunityMuted(user) {
  if (!user?.communityMutedUntil) return false;
  return new Date(user.communityMutedUntil).getTime() > Date.now();
}

/**
 * @param {import('../models/User')} user
 */
function getCommunityRestriction(user) {
  if (!user) return { canParticipate: false, reason: 'Usuario no encontrado' };
  if (user.communityBlocked) {
    return { canParticipate: false, reason: 'Tu cuenta está bloqueada en la comunidad.' };
  }
  if (isUserCommunityMuted(user)) {
    const until = new Date(user.communityMutedUntil).toLocaleString('es-ES');
    return { canParticipate: false, reason: `Estás silenciado hasta ${until}.` };
  }
  return { canParticipate: true, reason: null };
}

function notDeletedFilter() {
  return { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
}

module.exports = {
  logModerationAction,
  isUserCommunityMuted,
  getCommunityRestriction,
  notDeletedFilter,
};
