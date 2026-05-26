const auth = require('./auth');
const {
  predictionsLimiter,
  analizarLimiter,
  predictionsExportLimiter,
} = require('./routeRateLimits');

/**
 * Rutas premium: requieren JWT + suscripción activa (middleware auth).
 * Catálogo público (ligas, search-teams, listado equipos) queda fuera.
 */
function isPremiumProtectedPath(pathname) {
  const p = pathname || '';

  // IMPORTANTE:
  // - Clubes / Selecciones / Partidos y todo su contenido (fixtures, perfiles, equipos, ligas, etc.) es PÚBLICO.
  // - Solo las funciones premium (GoalLogic Predict / análisis) requieren sesión premium.

  if (p.startsWith('/api/predictions')) return true;
  if (p.startsWith('/api/predicciones')) return true;
  if (p.startsWith('/api/analizar')) return true;

  // Todo lo demás queda público.
  return false;
}

function premiumApiGuard(req, res, next) {
  const pathname = (req.originalUrl || req.url || req.path || '').split('?')[0];

  if (!isPremiumProtectedPath(pathname)) {
    return next();
  }

  if (pathname.startsWith('/api/predictions/export')) {
    return predictionsExportLimiter(req, res, () => auth(req, res, next));
  }
  if (pathname.startsWith('/api/analizar')) {
    return analizarLimiter(req, res, () => auth(req, res, next));
  }
  if (pathname.startsWith('/api/predictions')) {
    return predictionsLimiter(req, res, () => auth(req, res, next));
  }

  return auth(req, res, next);
}

module.exports = premiumApiGuard;
module.exports.isPremiumProtectedPath = isPremiumProtectedPath;
