const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Límite global 100 req/min por IP (excluye health y webhook Stripe).
 */
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.path === '/api/health' ||
    req.path === '/api/payments/webhook',
  handler: (req, res) => {
    logger.warn('global_rate_limit', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: 'Demasiadas solicitudes. Intenta en un minuto.',
    });
  },
});

module.exports = globalLimiter;
