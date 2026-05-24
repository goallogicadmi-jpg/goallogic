/**
 * Cache Distribuido Opcional para el Motor de Predicciones
 * 
 * Estructura preparada para usar Redis u otro sistema de cache distribuido.
 * Por ahora, delega en el cache en memoria, pero está listo para ser extendido.
 * 
 * Para activar Redis en el futuro:
 * 1. Instalar: npm install redis
 * 2. Configurar variables de entorno: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
 * 3. Descomentar código de Redis y comentar fallback a cache en memoria
 */

const predictionCache = require('./cache');

class DistributedCache {
  constructor() {
    this.useRedis = process.env.REDIS_ENABLED === 'true';
    this.redisClient = null;
    
    // Si Redis está habilitado, inicializar cliente
    if (this.useRedis) {
      this.initRedis();
    }
  }

  /**
   * Inicializar cliente Redis (preparado para futuro)
   */
  async initRedis() {
    try {
      // TODO: Descomentar cuando se active Redis
      // const redis = require('redis');
      // this.redisClient = redis.createClient({
      //   host: process.env.REDIS_HOST || 'localhost',
      //   port: process.env.REDIS_PORT || 6379,
      //   password: process.env.REDIS_PASSWORD || null
      // });
      // await this.redisClient.connect();
      // console.log('✅ [CACHE] Redis conectado');
      
      console.log('ℹ️ [CACHE] Redis deshabilitado, usando cache en memoria');
    } catch (error) {
      console.error('❌ [CACHE] Error conectando a Redis:', error.message);
      console.log('⚠️ [CACHE] Fallback a cache en memoria');
      this.useRedis = false;
    }
  }

  /**
   * Obtener valor desde cache (Redis o memoria)
   */
  async get(type, params) {
    if (this.useRedis && this.redisClient) {
      // TODO: Implementar cuando Redis esté activo
      // const key = this.generateKey(type, params);
      // const value = await this.redisClient.get(key);
      // return value ? JSON.parse(value) : null;
      
      // Por ahora, usar cache en memoria
      return predictionCache.get(type, params);
    }
    
    // Fallback a cache en memoria
    return predictionCache.get(type, params);
  }

  /**
   * Guardar valor en cache (Redis o memoria)
   */
  async set(type, params, value, ttl = null) {
    if (this.useRedis && this.redisClient) {
      // TODO: Implementar cuando Redis esté activo
      // const key = this.generateKey(type, params);
      // const ttlSeconds = ttl ? Math.floor(ttl / 1000) : 300; // Convertir a segundos
      // await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      // return;
      
      // Por ahora, usar cache en memoria
      predictionCache.set(type, params, value, ttl);
      return;
    }
    
    // Fallback a cache en memoria
    predictionCache.set(type, params, value, ttl);
  }

  /**
   * Invalidar entrada del cache
   */
  async invalidate(type, params = null) {
    if (this.useRedis && this.redisClient) {
      // TODO: Implementar cuando Redis esté activo
      // if (params) {
      //   const key = this.generateKey(type, params);
      //   await this.redisClient.del(key);
      // } else {
      //   const pattern = `${type}|*`;
      //   const keys = await this.redisClient.keys(pattern);
      //   if (keys.length > 0) {
      //     await this.redisClient.del(keys);
      //   }
      // }
      // return;
      
      // Por ahora, usar cache en memoria
      predictionCache.invalidate(type, params);
      return;
    }
    
    // Fallback a cache en memoria
    predictionCache.invalidate(type, params);
  }

  /**
   * Generar clave para cache
   */
  generateKey(type, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${type}|${sortedParams}`;
  }

  /**
   * Limpiar cache expirado
   */
  async cleanExpired() {
    if (this.useRedis && this.redisClient) {
      // Redis maneja expiración automáticamente
      return 0;
    }
    
    return predictionCache.cleanExpired();
  }

  /**
   * Obtener estadísticas del cache
   */
  async getStats() {
    if (this.useRedis && this.redisClient) {
      // TODO: Implementar cuando Redis esté activo
      // const info = await this.redisClient.info('stats');
      // return { type: 'redis', info };
      
      return { type: 'memory', ...predictionCache.getStats() };
    }
    
    return { type: 'memory', ...predictionCache.getStats() };
  }
}

// Instancia singleton
const distributedCache = new DistributedCache();

module.exports = distributedCache;
