const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

function limitHandler(label) {
  return (req, res) => {
    logger.warn('route_rate_limit', {
      label,
      ip: req.ip,
      path: req.originalUrl || req.path,
    });
    res.status(429).json({
      success: false,
      error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.',
    });
  };
}

const predictionsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler('predictions'),
});

const analizarLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler('analizar'),
});

const predictionsExportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler('predictions_export'),
});

const communityPostLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler('community_post'),
});

module.exports = {
  predictionsLimiter,
  analizarLimiter,
  predictionsExportLimiter,
  communityPostLimiter,
};
