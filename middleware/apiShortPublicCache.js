/**
 * Cache-Control corto para GET de catálogo (no datos personales).
 * max-age=300 (5 min) reduce carga en CDN/navegador sin staleness excesivo.
 */
const CACHE_HEADER = 'public, max-age=300';

/** Prefijos o rutas exactas permitidas para caché público */
function shouldCachePublic(pathname) {
  if (pathname === '/api/leagues') return true;
  if (pathname.startsWith('/api/league-info/')) return true;
  if (pathname === '/api/ligas') return true;
  if (pathname === '/api/predicciones/ligas') return true;
  if (/^\/api\/ligas\/[^/]+\/equipos$/.test(pathname)) return true;
  if (pathname.startsWith('/api/team-info/')) return true;
  if (pathname.startsWith('/api/league/')) return true;
  if (pathname === '/api/clubes/competitions' || pathname === '/api/selecciones/competitions') {
    return false;
  }
  if (/^\/api\/clubes\/competitions\/[^/]+\/seasons$/.test(pathname)) return true;
  if (/^\/api\/selecciones\/competitions\/[^/]+\/seasons$/.test(pathname)) return true;
  if (/^\/api\/clubes\/teams\/[^/]+\/profile$/.test(pathname)) return true;
  if (/^\/api\/selecciones\/teams\/[^/]+\/profile$/.test(pathname)) return true;
  return false;
}

function apiShortPublicCache(req, res, next) {
  if (req.method === 'GET' && shouldCachePublic(req.path)) {
    res.set('Cache-Control', CACHE_HEADER);
  }
  next();
}

module.exports = apiShortPublicCache;
