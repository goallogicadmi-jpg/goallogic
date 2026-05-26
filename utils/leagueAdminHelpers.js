const logger = require('./logger');

function logLeagueAction(action, req, payload = {}) {
  logger.info('admin_league_action', {
    action,
    actorId: req?.user?.id ? String(req.user.id) : null,
    ip: req?.ip || null,
    endpoint: req ? `${req.method} ${req.baseUrl}${req.path}` : null,
    ...payload,
  });
}

function parseDateQuery(value, endOfDay = false) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
}

module.exports = {
  logLeagueAction,
  parseDateQuery,
};
