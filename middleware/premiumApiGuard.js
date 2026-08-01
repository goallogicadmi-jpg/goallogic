const auth = require('./auth');
const {
  predictionsLimiter,
  analizarLimiter,
  predictionsExportLimiter,
} = require('./routeRateLimits');
const { createUsageLimiter } = require('./planUsageLimit');

/**
 * Rutas premium: JWT + plan (trial/pro/familia/free con límites).
 */
function isPremiumProtectedPath(pathname) {
  const p = pathname || '';

  if (p.startsWith('/api/predictions')) return true;
  if (p.startsWith('/api/predicciones')) return true;
  if (p.startsWith('/api/analizar')) return true;

  return false;
}

function runWithPlanAuth(req, res, next, usageType = null) {
  auth(req, res, () => {
    if (!usageType) return next();
    return createUsageLimiter(usageType)(req, res, next);
  });
}

function premiumApiGuard(req, res, next) {
  const pathname = (req.originalUrl || req.url || req.path || '').split('?')[0];

  if (!isPremiumProtectedPath(pathname)) {
    return next();
  }

  if (pathname.startsWith('/api/predictions/export')) {
    return predictionsExportLimiter(req, res, () =>
      runWithPlanAuth(req, res, next, 'predictions')
    );
  }
  if (pathname.startsWith('/api/analizar')) {
    return analizarLimiter(req, res, () => runWithPlanAuth(req, res, next, 'predictions'));
  }
  if (pathname.startsWith('/api/predictions')) {
    return predictionsLimiter(req, res, () => runWithPlanAuth(req, res, next, 'predictions'));
  }

  return runWithPlanAuth(req, res, next);
}

module.exports = premiumApiGuard;
module.exports.isPremiumProtectedPath = isPremiumProtectedPath;
