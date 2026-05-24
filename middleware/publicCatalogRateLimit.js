const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Catálogo público: límite básico anti-abuso (30 req/min por IP).
 */
function isPublicCatalogPath(pathname) {
  const p = pathname || '';
  if (p === '/api/leagues') return true;
  if (p.startsWith('/api/search-teams')) return true;
  if (p === '/api/equipos') return true;
  return false;
}

const publicCatalogLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('public_catalog_rate_limit', {
      ip: req.ip,
      path: req.originalUrl || req.path,
    });
    res.status(429).json({
      success: false,
      error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.',
    });
  },
});

function publicCatalogRateLimit(req, res, next) {
  const pathname = (req.originalUrl || req.url || req.path || '').split('?')[0];
  if (!isPublicCatalogPath(pathname)) {
    return next();
  }
  return publicCatalogLimiter(req, res, next);
}

module.exports = publicCatalogRateLimit;
module.exports.isPublicCatalogPath = isPublicCatalogPath;
