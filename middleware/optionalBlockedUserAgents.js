const logger = require('../utils/logger');

/**
 * Patrón opcional anti-scraping: si BLOCKED_USER_AGENTS está definido (subcadenas
 * separadas por coma), las peticiones cuyo User-Agent contenga alguna coincidencia
 * (sin distinguir mayúsculas) reciben 403 y log de seguridad.
 * Desactivado si la variable no existe o está vacía.
 *
 * Ejemplo: BLOCKED_USER_AGENTS=scrapy,python-requests,curl/7
 */
function parseBlockedSubstrings() {
  const raw = process.env.BLOCKED_USER_AGENTS;
  if (!raw || !String(raw).trim()) return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const blockedSubstrings = parseBlockedSubstrings();

function optionalBlockedUserAgents(req, res, next) {
  if (!blockedSubstrings.length) return next();

  const ua = (req.headers['user-agent'] || '').toLowerCase();
  if (!ua) return next();

  const hit = blockedSubstrings.find((sub) => ua.includes(sub));
  if (!hit) return next();

  logger.security('blocked_user_agent', {
    match: hit,
    ip: req.ip,
    path: req.originalUrl || req.url,
  });
  return res.status(403).json({
    success: false,
    error: 'Acceso no permitido',
  });
}

module.exports = optionalBlockedUserAgents;
