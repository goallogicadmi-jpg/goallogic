/**
 * Motor de Predicción Avanzado - GoalLogic
 * Lógica centralizada para generar predicciones de partidos
 * 
 * NOTA: Todos los valores arbitrarios han sido movidos a engine/predictionConfig.js
 */

const { getProfileConfig, getGlobalConfig } = require('./predictionConfig');

/**
 * Pesos por defecto para los factores de predicción
 * @deprecated Usar getProfileWeights('balanceado') desde predictionConfig.js
 * Mantenido para compatibilidad temporal
 */
const defaultWeights = {
  forma: 0.25,
  localia: 0.15,
  xg: 0.25,
  rachas: 0.05,
  rendimiento: 0.10,
  base: 0.30
};

/**
 * Calcula el factor de forma reciente
 * @param {string} formaStr - String con forma (ej: "WWDLL")
 * @param {Object} config - Configuración global (opcional, se obtiene automáticamente si no se proporciona)
 * @returns {number} - Factor entre 0 y 1
 */
function calcularFactorForma(formaStr, config = null) {
  if (!formaStr || formaStr === "N/A") return 0.5;
  
  // Obtener configuración si no se proporciona
  const globalConfig = config || getGlobalConfig();
  const formPoints = globalConfig.formPoints;
  
  const wins = (formaStr.match(/W/g) || []).length;
  const draws = (formaStr.match(/D/g) || []).length;
  const losses = (formaStr.match(/L/g) || []).length;
  
  // Usar valores de configuración en lugar de hardcodeados
  return (wins * formPoints.win + draws * formPoints.draw + losses * formPoints.loss) / formaStr.length;
}

/**
 * Normaliza xG/xGA basándose en promedios de liga
 * @param {number} xG - Expected Goals del equipo
 * @param {number} leagueAvgXG - Promedio de xG de la liga
 * @returns {number} - xG normalizado (ratio respecto a la liga)
 */
function normalizeXGByLeague(xG, leagueAvgXG) {
  if (!leagueAvgXG || leagueAvgXG <= 0) {
    // Si no hay promedio de liga, usar normalización temporal
    return Math.min(1, Math.max(0, parseFloat(xG) / 3));
  }
  
  // Normalizar: xG del equipo / promedio de liga
  // Un valor > 1 significa que el equipo está por encima del promedio
  const normalized = parseFloat(xG) / leagueAvgXG;
  
  // Limitar a un rango razonable (0.1 a 2.0) y luego escalar a 0-1
  const clamped = Math.min(2.0, Math.max(0.1, normalized));
  return (clamped - 0.1) / (2.0 - 0.1); // Escalar a 0-1
}

/**
 * Calcula el factor de xG
 * @param {number} xG - Expected Goals
 * @param {number} xGA - Expected Goals Against
 * @param {Object} config - Configuración global (opcional)
 * @param {Object} leagueAverages - Promedios de liga { xG: number, xGA: number } (opcional)
 * @returns {number} - Factor entre 0 y 1
 * 
 * NOTA: Ahora usa normalización basada en promedios de liga cuando están disponibles.
 */
function calcularFactorXG(xG, xGA, config = null, leagueAverages = null) {
  // Obtener configuración si no se proporciona
  const globalConfig = config || getGlobalConfig();
  
  // Si tenemos promedios de liga, usar normalización basada en liga
  if (leagueAverages && leagueAverages.xG && leagueAverages.xGA) {
    const xG_normalizado = normalizeXGByLeague(parseFloat(xG), leagueAverages.xG);
    const xGA_normalizado = 1 - normalizeXGByLeague(parseFloat(xGA), leagueAverages.xGA); // Menor xGA = mejor defensa
    
    return (xG_normalizado + xGA_normalizado) / 2;
  }
  
  // Si la normalización está deshabilitada o no hay promedios de liga, usar normalización temporal
  if (!globalConfig.xgNormalization.enabled) {
    // Usar xG y xGA directamente, normalizando solo para que estén entre 0 y 1
    // Usar un rango razonable basado en valores típicos de fútbol (0-3 goles por partido)
    const xG_normalizado = Math.min(1, Math.max(0, parseFloat(xG) / 3));
    const xGA_normalizado = Math.min(1, Math.max(0, 1 - (parseFloat(xGA) / 3))); // Menor xGA = mejor defensa
    
    return (xG_normalizado + xGA_normalizado) / 2;
  }
  
  // Fallback temporal (no debería llegar aquí)
  return 0.5;
}

/**
 * Calcula el factor de racha
 * @param {number} racha - Número de partidos consecutivos
 * @param {Object} config - Configuración global (opcional, se obtiene automáticamente si no se proporciona)
 * @returns {number} - Factor entre 0 y maxBonus
 */
function calcularFactorRacha(racha, config = null) {
  // Obtener configuración si no se proporciona
  const globalConfig = config || getGlobalConfig();
  const streakConfig = globalConfig.streakFactor;
  
  // Usar valores de configuración en lugar de hardcodeados
  return Math.min(streakConfig.maxBonus, racha * streakConfig.incrementPerGame);
}

/**
 * Calcula el factor de rendimiento
 * @param {number} rendimiento - Porcentaje de puntos obtenidos
 * @returns {number} - Factor entre 0 y 1
 */
function calcularFactorRendimiento(rendimiento) {
  return parseFloat(rendimiento) / 100;
}

/**
 * Calcula la probabilidad de Poisson para k goles
 * @param {number} lambda - Tasa promedio de goles esperados
 * @param {number} k - Número de goles
 * @returns {number} - Probabilidad de que ocurran k goles
 */
function poissonProbability(lambda, k) {
  if (lambda <= 0) return 0;
  if (k < 0) return 0;
  
  // P(k; λ) = (λ^k * e^(-λ)) / k!
  let factorial = 1;
  for (let i = 2; i <= k; i++) {
    factorial *= i;
  }
  
  return Math.pow(lambda, k) * Math.exp(-lambda) / factorial;
}

/**
 * Calcula distribución de probabilidades de goles usando Poisson
 * @param {number} lambda - Tasa de goles esperados
 * @param {number} maxGoals - Máximo número de goles a calcular (default: 5)
 * @returns {Object} - Distribución de probabilidades para 0, 1, 2, 3, 4, 5+ goles
 */
function calculateGoalDistribution(lambda, maxGoals = 5) {
  const distribution = {};
  
  // Calcular probabilidades para 0 a maxGoals-1
  for (let k = 0; k < maxGoals; k++) {
    distribution[`prob${k}`] = poissonProbability(lambda, k);
  }
  
  // Probabilidad de maxGoals o más goles (1 - suma de probabilidades anteriores)
  let sumPrevious = 0;
  for (let k = 0; k < maxGoals; k++) {
    sumPrevious += distribution[`prob${k}`];
  }
  distribution[`prob${maxGoals}Plus`] = Math.max(0, 1 - sumPrevious);
  
  return distribution;
}

/**
 * Calcula goles esperados usando método simple (promedio)
 * @param {number} goalsFor - Promedio de goles a favor
 * @param {number} goalsAgainst - Promedio de goles en contra del rival
 * @returns {number} - Goles esperados
 * 
 * NOTA: Este es un método temporal. Se usa como fallback cuando Poisson no está disponible.
 */
function calculateExpectedGoalsSimple(goalsFor, goalsAgainst) {
  return parseFloat(((goalsFor + goalsAgainst) / 2).toFixed(1));
}

/**
 * Calcula goles esperados usando modelo Poisson
 * @param {number} teamGoalsFor - Promedio de goles a favor del equipo
 * @param {number} opponentGoalsAgainst - Promedio de goles en contra del oponente
 * @param {number} leagueAvgGoalsFor - Promedio de goles de la liga (opcional, para ajuste)
 * @param {number} leagueAvgGoalsAgainst - Promedio de goles en contra de la liga (opcional)
 * @param {number} homeAdvantage - Factor de ventaja local (default: 1.0, sin ventaja)
 * @returns {Object} - { expected: number, lambda: number, distribution: Object }
 */
function calculateExpectedGoalsPoisson(teamGoalsFor, opponentGoalsAgainst, leagueAvgGoalsFor = null, leagueAvgGoalsAgainst = null, homeAdvantage = 1.0) {
  // Calcular lambda (tasa de goles esperados)
  // Usar promedio de goles del equipo y goles en contra del oponente
  let lambda = (teamGoalsFor + opponentGoalsAgainst) / 2;
  
  // Ajustar por ventaja local si se proporciona
  lambda = lambda * homeAdvantage;
  
  // Si tenemos promedios de liga, ajustar lambda para normalizar
  // Esto ayuda a comparar equipos de diferentes ligas o temporadas
  if (leagueAvgGoalsFor !== null && leagueAvgGoalsAgainst !== null && leagueAvgGoalsFor > 0 && leagueAvgGoalsAgainst > 0) {
    const leagueAvg = (leagueAvgGoalsFor + leagueAvgGoalsAgainst) / 2;
    // Ajuste suave: combinar lambda del equipo con promedio de liga (70% equipo, 30% liga)
    // TODO: Calibrar este porcentaje con datos reales
    lambda = lambda * 0.7 + leagueAvg * 0.3;
  }
  
  // Asegurar que lambda sea positivo y razonable (máximo 5 goles por partido)
  lambda = Math.max(0.1, Math.min(5.0, lambda));
  
  // Calcular distribución de goles
  const distribution = calculateGoalDistribution(lambda);
  
  return {
    expected: parseFloat(lambda.toFixed(2)),
    lambda: lambda,
    distribution: distribution
  };
}

/**
 * Calcula matriz de probabilidades de marcador usando Poisson
 * @param {number} lambdaHome - Tasa de goles del equipo local
 * @param {number} lambdaAway - Tasa de goles del equipo visitante
 * @param {number} maxGoals - Máximo número de goles a considerar (default: 5)
 * @returns {Object} - Matriz de probabilidades y probabilidades de resultado
 */
function calculateScoreMatrix(lambdaHome, lambdaAway, maxGoals = 5) {
  // Intentar obtener desde cache
  const poissonCache = require('./poissonCache');
  const cached = poissonCache.get(lambdaHome, lambdaAway);
  
  if (cached) {
    return cached;
  }
  const matrix = {};
  let probHomeWin = 0;
  let probDraw = 0;
  let probAwayWin = 0;
  
  // Calcular probabilidades para cada marcador posible
  for (let homeGoals = 0; homeGoals <= maxGoals; homeGoals++) {
    for (let awayGoals = 0; awayGoals <= maxGoals; awayGoals++) {
      const probHome = homeGoals < maxGoals 
        ? poissonProbability(lambdaHome, homeGoals)
        : calculateGoalDistribution(lambdaHome, maxGoals).prob5Plus;
      const probAway = awayGoals < maxGoals
        ? poissonProbability(lambdaAway, awayGoals)
        : calculateGoalDistribution(lambdaAway, maxGoals).prob5Plus;
      
      const probScore = probHome * probAway;
      
      // Guardar probabilidad del marcador
      matrix[`${homeGoals}-${awayGoals}`] = probScore;
      
      // Acumular probabilidades de resultado
      if (homeGoals > awayGoals) {
        probHomeWin += probScore;
      } else if (homeGoals === awayGoals) {
        probDraw += probScore;
      } else {
        probAwayWin += probScore;
      }
    }
  }
  
  // Normalizar probabilidades (deben sumar 1.0)
  const total = probHomeWin + probDraw + probAwayWin;
  if (total > 0) {
    probHomeWin = probHomeWin / total;
    probDraw = probDraw / total;
    probAwayWin = probAwayWin / total;
  }
  
  const result = {
    matrix: matrix,
    probHomeWin: probHomeWin,
    probDraw: probDraw,
    probAwayWin: probAwayWin
  };
  
  // Guardar en cache
  poissonCache.set(lambdaHome, lambdaAway, result);
  
  return result;
}

/**
 * Motor principal de predicción
 * @param {Object} params - Parámetros de entrada
 * @param {Object} params.homeStats - Estadísticas del equipo local
 * @param {Object} params.awayStats - Estadísticas del equipo visitante
 * @param {Object} params.metricas - Métricas avanzadas calculadas
 * @param {Object} params.weights - Pesos configurables (opcional)
 * @param {Object} params.config - Configuración completa del perfil (opcional, se obtiene automáticamente)
 * @returns {Object} - Objeto con predicciones y métricas
 */
function predictionEngine({ homeStats, awayStats, metricas, weights = null, config = null, leagueAverages = null, usePoisson = true }) {
  // Si no se proporciona configuración, obtenerla del perfil (si se proporciona)
  // Por ahora, obtener configuración global
  const globalConfig = config?.global || getGlobalConfig();
  
  // Si no se proporcionan pesos, usar los del perfil balanceado por defecto
  if (!weights) {
    const { getProfileWeights } = require('./predictionConfig');
    weights = getProfileWeights('balanceado');
  }
  
  // Si se proporciona config completo, usar sus pesos
  if (config && config.weights) {
    weights = config.weights;
  }
  // Validar que los pesos sumen aproximadamente 1
  const sumaPesos = Object.values(weights).reduce((sum, val) => sum + val, 0);
  if (Math.abs(sumaPesos - 1.0) > 0.01) {
    console.warn(`⚠️ Los pesos no suman 1.0 (suman ${sumaPesos}). Normalizando...`);
    // Normalizar pesos
    Object.keys(weights).forEach(key => {
      weights[key] = weights[key] / sumaPesos;
    });
  }

  // ============================================
  // CALCULAR FACTORES BASE
  // ============================================
  const homeWinRate = homeStats?.fixtures?.wins?.total / (homeStats?.fixtures?.played?.total || 1) || 0;
  const awayWinRate = awayStats?.fixtures?.wins?.total / (awayStats?.fixtures?.played?.total || 1) || 0;
  const homeDrawRate = homeStats?.fixtures?.draws?.total / (homeStats?.fixtures?.played?.total || 1) || 0;

  // ============================================
  // CALCULAR FACTORES AVANZADOS
  // ============================================
  const factorFormaLocal = calcularFactorForma(metricas.forma_local, globalConfig);
  const factorFormaVisita = calcularFactorForma(metricas.forma_visita, globalConfig);
  
  // Obtener factor de localía desde configuración
  const factorLocalia = globalConfig.homeAdvantage.base;
  
  // Calcular factor xG con normalización basada en liga si está disponible
  const leagueXGAverages = leagueAverages ? {
    xG: leagueAverages.xG || null,
    xGA: leagueAverages.xGA || null
  } : null;
  
  const factorXGLocal = calcularFactorXG(metricas.xG_local, metricas.xGA_local, globalConfig, leagueXGAverages);
  const factorXGVisita = calcularFactorXG(metricas.xG_visita, metricas.xGA_visita, globalConfig, leagueXGAverages);
  
  const factorRachaLocal = calcularFactorRacha(metricas.racha_local, globalConfig);
  const factorRachaVisita = calcularFactorRacha(metricas.racha_visita, globalConfig);
  
  const factorRendimientoLocal = calcularFactorRendimiento(metricas.rendimiento_local);
  const factorRendimientoVisita = calcularFactorRendimiento(metricas.rendimiento_visita);

  // ============================================
  // CALCULAR PROBABILIDADES
  // ============================================
  
  const probLimits = globalConfig.probabilityLimits;
  let prob_local_ajustada, prob_empate_ajustada, prob_visita_ajustada;
  
  // Si tenemos probabilidades de Poisson, combinarlas con factores tradicionales
  if (usePoisson && poissonProbabilities) {
    // Combinar probabilidades de Poisson con factores tradicionales
    // Usar pesos calibrados desde configuración
    const poissonCalibration = globalConfig.poissonCalibration;
    const poissonWeight = poissonCalibration.poissonWeight;
    const traditionalWeight = poissonCalibration.traditionalWeight;
    
    // Calcular probabilidades tradicionales
    const prob_local_tradicional = Math.min(probLimits.max, Math.max(probLimits.min,
      homeWinRate * weights.base +
      factorFormaLocal * weights.forma +
      factorLocalia * weights.localia +
      factorXGLocal * weights.xg +
      factorRachaLocal * weights.rachas +
      factorRendimientoLocal * weights.rendimiento
    ));
    
    const prob_visita_tradicional = Math.min(probLimits.max, Math.max(probLimits.min,
      awayWinRate * weights.base +
      factorFormaVisita * weights.forma +
      factorXGVisita * weights.xg +
      factorRachaVisita * weights.rachas +
      factorRendimientoVisita * weights.rendimiento -
      factorLocalia * weights.localia
    ));
    
    const diferenciaForma = Math.abs(factorFormaLocal - factorFormaVisita);
    const diferenciaRendimiento = Math.abs(factorRendimientoLocal - factorRendimientoVisita);
    const drawWeights = config?.drawWeights || globalConfig.drawWeights;
    const drawLimits = globalConfig.drawLimits;
    
    const prob_empate_tradicional = Math.min(drawLimits.max, Math.max(drawLimits.min,
      homeDrawRate * drawWeights.base +
      (1 - diferenciaForma) * drawWeights.formDifference +
      (1 - diferenciaRendimiento) * drawWeights.performanceDifference
    ));
    
    // Combinar probabilidades
    prob_local_ajustada = poissonProbabilities.probHomeWin * poissonWeight + prob_local_tradicional * traditionalWeight;
    prob_visita_ajustada = poissonProbabilities.probAwayWin * poissonWeight + prob_visita_tradicional * traditionalWeight;
    prob_empate_ajustada = poissonProbabilities.probDraw * poissonWeight + prob_empate_tradicional * traditionalWeight;
  } else {
    // Usar solo factores tradicionales (fallback)
    
    prob_local_ajustada = Math.min(probLimits.max, Math.max(probLimits.min,
      homeWinRate * weights.base +
      factorFormaLocal * weights.forma +
      factorLocalia * weights.localia +
      factorXGLocal * weights.xg +
      factorRachaLocal * weights.rachas +
      factorRendimientoLocal * weights.rendimiento
    ));
    
    prob_visita_ajustada = Math.min(probLimits.max, Math.max(probLimits.min,
      awayWinRate * weights.base +
      factorFormaVisita * weights.forma +
      factorXGVisita * weights.xg +
      factorRachaVisita * weights.rachas +
      factorRendimientoVisita * weights.rendimiento -
      factorLocalia * weights.localia
    ));
    
    const diferenciaForma = Math.abs(factorFormaLocal - factorFormaVisita);
    const diferenciaRendimiento = Math.abs(factorRendimientoLocal - factorRendimientoVisita);
    const drawWeights = config?.drawWeights || globalConfig.drawWeights;
    const drawLimits = globalConfig.drawLimits;
    
    prob_empate_ajustada = Math.min(drawLimits.max, Math.max(drawLimits.min,
      homeDrawRate * drawWeights.base +
      (1 - diferenciaForma) * drawWeights.formDifference +
      (1 - diferenciaRendimiento) * drawWeights.performanceDifference
    ));
  }

  // ============================================
  // NORMALIZAR PROBABILIDADES
  // ============================================
  const total = prob_local_ajustada + prob_empate_ajustada + prob_visita_ajustada;
  const probLocalNormalizada = prob_local_ajustada / total;
  const probEmpateNormalizada = prob_empate_ajustada / total;
  const probVisitaNormalizada = prob_visita_ajustada / total;

  // ============================================
  // GENERAR RECOMENDACIÓN INTELIGENTE
  // ============================================
  const diferenciaProb = Math.abs(probLocalNormalizada - probVisitaNormalizada);
  let recomendacion = "";
  
  // Obtener umbrales desde configuración
  const thresholds = globalConfig.recommendationThresholds;
  
  if (probLocalNormalizada > thresholds.highProbability) {
    recomendacion = "Victoria Local";
  } else if (probVisitaNormalizada > thresholds.highProbability) {
    recomendacion = "Victoria Visitante";
  } else if (probEmpateNormalizada > thresholds.drawProbability && diferenciaProb < thresholds.smallDifference) {
    recomendacion = "Empate Probable";
  } else if (probLocalNormalizada > probVisitaNormalizada) {
    if (factorFormaLocal > thresholds.strongForm && metricas.racha_local >= thresholds.minStreak) {
      recomendacion = "Victoria Local (Forma Fuerte)";
    } else {
      recomendacion = "Victoria Local";
    }
  } else {
    if (factorFormaVisita > thresholds.strongForm && metricas.racha_visita >= thresholds.minStreak) {
      recomendacion = "Victoria Visitante (Forma Fuerte)";
    } else {
      recomendacion = "Victoria Visitante";
    }
  }

  // ============================================
  // CALCULAR GOLES ESPERADOS Y PROBABILIDADES POISSON
  // ============================================
  const homeGoalsFor = homeStats?.goals?.for?.average?.total || 0;
  const homeGoalsAgainst = homeStats?.goals?.against?.average?.total || 0;
  const awayGoalsFor = awayStats?.goals?.for?.average?.total || 0;
  const awayGoalsAgainst = awayStats?.goals?.against?.average?.total || 0;
  
  // Calcular promedios de liga para ajuste (si están disponibles)
  const leagueAvgGoalsFor = leagueAverages?.goalsFor || null;
  const leagueAvgGoalsAgainst = leagueAverages?.goalsAgainst || null;
  
  // Calcular factor de ventaja local para Poisson
  const homeAdvantageFactor = 1.0 + (globalConfig.homeAdvantage.base * 0.1); // Ajuste suave (ej: 1.015 para 15% base)
  
  let golesLocal, golesVisita;
  let poissonResults = null;
  let poissonProbabilities = null;
  let xgNormalized = false;
  
  if (usePoisson) {
    // Calcular goles esperados usando modelo Poisson
    const poissonLocal = calculateExpectedGoalsPoisson(
      homeGoalsFor,
      awayGoalsAgainst,
      leagueAvgGoalsFor,
      leagueAvgGoalsAgainst,
      homeAdvantageFactor
    );
    
    const poissonAway = calculateExpectedGoalsPoisson(
      awayGoalsFor,
      homeGoalsAgainst,
      leagueAvgGoalsFor,
      leagueAvgGoalsAgainst,
      1.0 / homeAdvantageFactor // Desventaja para visitante
    );
    
    golesLocal = poissonLocal.expected;
    golesVisita = poissonAway.expected;
    
    // Calcular matriz de probabilidades de marcador
    poissonResults = {
      local: poissonLocal,
      visitante: poissonAway
    };
    
    poissonProbabilities = calculateScoreMatrix(poissonLocal.lambda, poissonAway.lambda);
  } else {
    // Fallback: usar cálculo simple
    golesLocal = calculateExpectedGoalsSimple(homeGoalsFor, awayGoalsAgainst);
    golesVisita = calculateExpectedGoalsSimple(awayGoalsFor, homeGoalsAgainst);
  }
  
  // Verificar si se usó normalización de xG basada en liga
  xgNormalized = (leagueXGAverages && leagueXGAverages.xG && leagueXGAverages.xGA);

  return {
    prob_local: probLocalNormalizada,
    prob_empate: probEmpateNormalizada,
    prob_visita: probVisitaNormalizada,
    goles_local: parseFloat(golesLocal),
    goles_visita: parseFloat(golesVisita),
    recomendacion: recomendacion,
    weights_used: weights,
    // Información sobre métodos usados
    poisson_used: usePoisson && poissonProbabilities !== null,
    xg_normalized: xgNormalized,
    poisson_results: poissonResults,
    poisson_probabilities: poissonProbabilities
  };
}

module.exports = {
  predictionEngine,
  defaultWeights,
  // Funciones auxiliares exportadas
  calculateExpectedGoalsSimple,
  calculateExpectedGoalsPoisson,
  calculateGoalDistribution,
  calculateScoreMatrix,
  poissonProbability,
  normalizeXGByLeague
};
