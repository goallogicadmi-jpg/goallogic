/**
 * Cache para Matrices de Probabilidades Poisson
 * 
 * Evita recalcular matrices Poisson si los parámetros lambda no cambian.
 */

class PoissonCache {
  constructor() {
    this.matrixCache = new Map();
    this.maxCacheSize = 100; // Máximo de matrices en cache
  }

  /**
   * Genera clave para el cache basada en lambdaHome y lambdaAway
   */
  generateKey(lambdaHome, lambdaAway) {
    // Redondear a 2 decimales para agrupar valores similares
    const roundedHome = Math.round(lambdaHome * 100) / 100;
    const roundedAway = Math.round(lambdaAway * 100) / 100;
    return `${roundedHome}|${roundedAway}`;
  }

  /**
   * Obtiene matriz de probabilidades desde cache
   */
  get(lambdaHome, lambdaAway) {
    const key = this.generateKey(lambdaHome, lambdaAway);
    return this.matrixCache.get(key) || null;
  }

  /**
   * Guarda matriz de probabilidades en cache
   */
  set(lambdaHome, lambdaAway, matrix) {
    // Limpiar cache si está lleno
    if (this.matrixCache.size >= this.maxCacheSize) {
      // Eliminar la entrada más antigua (FIFO)
      const firstKey = this.matrixCache.keys().next().value;
      this.matrixCache.delete(firstKey);
    }

    const key = this.generateKey(lambdaHome, lambdaAway);
    this.matrixCache.set(key, matrix);
  }

  /**
   * Limpia el cache
   */
  clear() {
    this.matrixCache.clear();
  }

  /**
   * Obtiene estadísticas del cache
   */
  getStats() {
    return {
      size: this.matrixCache.size,
      maxSize: this.maxCacheSize
    };
  }
}

// Instancia singleton
const poissonCache = new PoissonCache();

module.exports = poissonCache;
