/**
 * Sistema de Caché Simple para el Motor de Predicciones
 * 
 * Cachea datos para reducir llamadas a la API y mejorar rendimiento.
 * Invalidación automática basada en tiempo y parámetros.
 */

class PredictionCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutos por defecto
  }

  /**
   * Genera una clave única para el cache
   */
  generateKey(type, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${type}|${sortedParams}`;
  }

  /**
   * Obtiene un valor del cache si existe y no ha expirado
   */
  get(type, params) {
    const key = this.generateKey(type, params);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Verificar si ha expirado
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Guarda un valor en el cache
   */
  set(type, params, value, ttl = null) {
    const key = this.generateKey(type, params);
    const ttlMs = ttl || this.defaultTTL;
    
    this.cache.set(key, {
      value: value,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now()
    });
  }

  /**
   * Invalida entradas del cache por tipo
   */
  invalidate(type, params = null) {
    if (params) {
      // Invalidar entrada específica
      const key = this.generateKey(type, params);
      this.cache.delete(key);
    } else {
      // Invalidar todas las entradas del tipo
      const keysToDelete = [];
      for (const [key] of this.cache) {
        if (key.startsWith(`${type}|`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
    }
  }

  /**
   * Limpia el cache expirado
   */
  cleanExpired() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, cached] of this.cache) {
      if (now > cached.expiresAt) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    return keysToDelete.length;
  }

  /**
   * Limpia todo el cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Obtiene estadísticas del cache
   */
  getStats() {
    const now = Date.now();
    let total = 0;
    let expired = 0;
    let active = 0;

    for (const [key, cached] of this.cache) {
      total++;
      if (now > cached.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total,
      active,
      expired,
      size: this.cache.size
    };
  }
}

// Instancia singleton
const predictionCache = new PredictionCache();

// Limpiar cache expirado cada minuto
setInterval(() => {
  const cleaned = predictionCache.cleanExpired();
  if (cleaned > 0) {
    console.log(`🧹 [CACHE] Limpiadas ${cleaned} entradas expiradas`);
  }
}, 60 * 1000);

module.exports = predictionCache;
