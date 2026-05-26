import { resolveApiUrl } from '../config/apiBase.js';

let cache = null;
let cacheAt = 0;
const CACHE_MS = 60 * 1000;

/**
 * Contenido CMS publicado (noticias, avisos, banners).
 */
export async function getPublicCmsContent({ force = false } = {}) {
  if (!force && cache && Date.now() - cacheAt < CACHE_MS) {
    return cache;
  }

  const res = await fetch(resolveApiUrl('/api/cms/public'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Error al cargar contenido');
  }

  cache = data.data;
  cacheAt = Date.now();
  return cache;
}

export function invalidateCmsPublicCache() {
  cache = null;
  cacheAt = 0;
}
