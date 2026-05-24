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

  if (p.startsWith('/api/search-teams')) return false;
  if (p === '/api/leagues') return false;
  if (p === '/api/equipos') return false;
  if (p.startsWith('/api/clubes/competitions')) return false;
  if (p.startsWith('/api/selecciones/competitions')) return false;
  if (p.startsWith('/api/league-info')) return false;

  if (p.startsWith('/api/predictions')) return true;
  if (p.startsWith('/api/predicciones')) return true;
  if (p.startsWith('/api/analizar')) return true;
  if (p.startsWith('/api/h2h')) return true;
  if (p.startsWith('/api/fixtures')) return true;
  if (p.startsWith('/api/team-')) return true;
  if (p.startsWith('/api/players/')) return true;
  if (p.startsWith('/api/jugadores/')) return true;
  if (p.startsWith('/api/jugador/')) return true;
  if (p.startsWith('/api/news')) return true;
  if (/^\/api\/equipos\/[^/]+\/detalle$/.test(p)) return true;
  if (p.startsWith('/api/squad')) return true;
  if (p === '/api/search' || p.startsWith('/api/search/')) return true;
  if (p.startsWith('/api/clubes/fixtures')) return true;
  if (p.startsWith('/api/selecciones/fixtures')) return true;
  if (p === '/api/partidos' || p.startsWith('/api/partidos/')) return true;
  if (p.startsWith('/api/clubes/teams/')) return true;
  if (p.startsWith('/api/selecciones/teams/')) return true;
  if (/^\/api\/league\/\d+/.test(p)) return true;
  if (p.startsWith('/estadisticas')) return true;
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
