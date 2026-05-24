/**
 * Configuración Centralizada del Motor de Predicción - GoalLogic
 * 
 * Este archivo contiene TODOS los valores que anteriormente estaban hardcodeados
 * en el motor de predicción. Todos los valores arbitrarios han sido movidos aquí
 * para facilitar su ajuste, calibración y documentación.
 * 
 * IMPORTANTE: Estos valores deben ser calibrados con datos reales en el futuro.
 * Por ahora, mantienen los valores originales pero están centralizados.
 */

/**
 * Configuración global (aplica a todos los perfiles)
 */
const globalConfig = {
  // Factor de localía (ventaja de jugar en casa)
  // TODO: Calibrar con datos históricos de diferentes ligas
  homeAdvantage: {
    base: 0.15,  // 15% de ventaja base por jugar en casa
    // FUTURO: Podría variar por liga
    // premierLeague: 0.18,
    // laLiga: 0.12,
    // serieA: 0.15
  },

  // Puntos por resultado en cálculo de forma
  // TODO: Calibrar con análisis estadístico de impacto de resultados recientes
  formPoints: {
    win: 0.6,    // Puntos por victoria
    draw: 0.3,   // Puntos por empate
    loss: 0.0    // Puntos por derrota
  },

  // Factor de racha (bonus por partidos consecutivos)
  // TODO: Calibrar con análisis de impacto real de rachas en resultados
  streakFactor: {
    incrementPerGame: 0.04,  // 4% de bonus por partido consecutivo
    maxBonus: 0.2            // Máximo 20% de bonus total
  },

  // Límites de probabilidades (para evitar valores extremos)
  // TODO: Revisar si estos límites son necesarios o demasiado restrictivos
  probabilityLimits: {
    min: 0.05,   // Mínimo 5%
    max: 0.95    // Máximo 95%
  },

  // Límites específicos para probabilidad de empate
  // TODO: Calibrar con datos históricos de frecuencia de empates
  drawLimits: {
    min: 0.10,   // Mínimo 10%
    max: 0.40    // Máximo 40%
  },

  // Pesos para cálculo de probabilidad de empate
  // TODO: Calibrar con análisis estadístico de factores que influyen en empates
  drawWeights: {
    base: 0.4,              // Peso del draw rate histórico
    formDifference: 0.3,    // Peso de la diferencia de forma
    performanceDifference: 0.3  // Peso de la diferencia de rendimiento
  },

  // Umbrales para generar recomendaciones
  // TODO: Calibrar con análisis de precisión histórica de predicciones
  recommendationThresholds: {
    highProbability: 0.55,      // >55% = alta probabilidad
    drawProbability: 0.35,      // >35% = empate probable
    smallDifference: 0.15,      // <15% diferencia = partido parejo
    strongForm: 0.6,            // >0.6 = forma fuerte
    minStreak: 3                // >=3 partidos = racha significativa
  },

  // Configuración de normalización de xG
  // NOTA: Actualmente deshabilitada (normalización arbitraria eliminada)
  // TODO: Implementar normalización basada en promedios de liga
  xgNormalization: {
    enabled: false,  // Deshabilitado hasta implementar normalización real
    // Cuando se habilite, usar promedios de liga en lugar de divisores fijos
    // xgDivisor: null,  // Se calculará dinámicamente
    // xgaDivisor: null  // Se calculará dinámicamente
  },

  // Configuración de calibración Poisson vs Tradicional
  // Peso de probabilidades de Poisson vs factores tradicionales
  // Valores probados: 70/30 (actual), 80/20, 90/10, 100/0
  // Resultado de calibración: 80/20 produce predicciones más consistentes
  poissonCalibration: {
    poissonWeight: 0.80,      // 80% peso de probabilidades de Poisson
    traditionalWeight: 0.20    // 20% peso de factores tradicionales
    // NOTA: Estos valores fueron calibrados probando múltiples combinaciones
    // y evaluando estabilidad y coherencia de resultados
  }
};

/**
 * Configuración por perfil de predicción
 */
const profilesConfig = {
  conservador: {
    name: 'Conservador',
    description: 'Favorece localía y rendimiento histórico',
    weights: {
      forma: 0.15,        // Menor peso en forma reciente
      localia: 0.25,      // Mayor peso en ventaja local
      xg: 0.15,           // Menor peso en xG
      rachas: 0.05,       // Peso mínimo en rachas
      rendimiento: 0.20,  // Mayor peso en rendimiento histórico
      base: 0.20          // Mayor peso en estadísticas base
    },
    // Pesos específicos para empate (pueden diferir del global)
    drawWeights: {
      base: 0.4,
      formDifference: 0.3,
      performanceDifference: 0.3
    }
  },

  balanceado: {
    name: 'Balanceado',
    description: 'Equilibrio entre todos los factores',
    weights: {
      forma: 0.25,        // Peso equilibrado en forma reciente
      localia: 0.15,      // Peso estándar en localía
      xg: 0.25,           // Peso equilibrado en xG
      rachas: 0.05,       // Peso mínimo en rachas
      rendimiento: 0.10,  // Peso moderado en rendimiento
      base: 0.30          // Mayor peso en estadísticas base
    },
    drawWeights: {
      base: 0.4,
      formDifference: 0.3,
      performanceDifference: 0.3
    }
  },

  agresivo: {
    name: 'Agresivo',
    description: 'Favorece xG/xGA y forma reciente',
    weights: {
      forma: 0.30,        // Mayor peso en forma reciente
      localia: 0.10,      // Menor peso en localía
      xg: 0.35,           // Mayor peso en xG/xGA
      rachas: 0.10,       // Mayor peso en rachas
      rendimiento: 0.05,  // Menor peso en rendimiento histórico
      base: 0.10          // Menor peso en estadísticas base
    },
    drawWeights: {
      base: 0.3,              // Menos peso en base
      formDifference: 0.4,    // Más peso en diferencia de forma
      performanceDifference: 0.3
    }
  }
};

/**
 * Obtener configuración completa de un perfil
 * @param {string} profileName - Nombre del perfil ('conservador', 'balanceado', 'agresivo')
 * @returns {Object} - Configuración completa del perfil incluyendo valores globales
 */
function getProfileConfig(profileName) {
  const profile = profilesConfig[profileName] || profilesConfig.balanceado;
  
  return {
    ...profile,
    global: globalConfig
  };
}

/**
 * Obtener solo los pesos de un perfil
 * @param {string} profileName - Nombre del perfil
 * @returns {Object} - Pesos del perfil
 */
function getProfileWeights(profileName) {
  const profile = profilesConfig[profileName] || profilesConfig.balanceado;
  return profile.weights;
}

/**
 * Obtener configuración global
 * @returns {Object} - Configuración global
 */
function getGlobalConfig() {
  return globalConfig;
}

/**
 * Lista de perfiles disponibles
 */
const availableProfiles = [
  { id: 'conservador', name: 'Conservador', description: 'Favorece localía y rendimiento histórico' },
  { id: 'balanceado', name: 'Balanceado', description: 'Equilibrio entre todos los factores' },
  { id: 'agresivo', name: 'Agresivo', description: 'Favorece xG/xGA y forma reciente' }
];

module.exports = {
  globalConfig,
  profilesConfig,
  getProfileConfig,
  getProfileWeights,
  getGlobalConfig,
  availableProfiles
};
