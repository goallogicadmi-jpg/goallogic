/**
 * Sistema de Logging para Predicciones
 * Registra predicciones y resultados reales para futuro entrenamiento de ML
 */

const fs = require('fs');
const path = require('path');

// Ruta del archivo de logs
const LOG_FILE_PATH = path.join(__dirname, '..', 'data', 'predictions_log.json');

// Asegurar que el directorio existe
const dataDir = path.dirname(LOG_FILE_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Cargar logs existentes
 * @returns {Array} - Array de logs
 */
function loadLogs() {
  try {
    if (fs.existsSync(LOG_FILE_PATH)) {
      const data = fs.readFileSync(LOG_FILE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('❌ [LOGGING] Error cargando logs:', error);
  }
  return [];
}

/**
 * Guardar logs
 * @param {Array} logs - Array de logs a guardar
 */
function saveLogs(logs) {
  try {
    fs.writeFileSync(LOG_FILE_PATH, JSON.stringify(logs, null, 2), 'utf8');
  } catch (error) {
    console.error('❌ [LOGGING] Error guardando logs:', error);
  }
}

/**
 * Registrar una predicción
 * @param {Object} params - Parámetros de la predicción
 * @param {number} params.fixtureId - ID del fixture
 * @param {number} params.homeTeamId - ID del equipo local
 * @param {number} params.awayTeamId - ID del equipo visitante
 * @param {string} params.profile - Perfil usado
 * @param {Object} params.predicciones - Objeto con probabilidades
 * @param {Object} params.metricas - Métricas avanzadas
 * @param {string} params.recomendacion - Recomendación generada
 * @param {Object} params.resultadoReal - Resultado real (opcional, si el partido ya finalizó)
 */
function logPrediction({
  fixtureId,
  homeTeamId,
  awayTeamId,
  profile,
  predicciones,
  metricas,
  recomendacion,
  resultadoReal = null,
}) {
  try {
    // Cargar logs existentes
    const logs = loadLogs();

    // Crear entrada de log
    const logEntry = {
      // Identificadores
      fixture_id: fixtureId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      
      // Fecha y hora
      timestamp: new Date().toISOString(),
      fecha_prediccion: new Date().toISOString().split('T')[0],
      
      // Configuración
      profile: profile,
      
      // Predicciones
      prob_local: predicciones.prob_local,
      prob_empate: predicciones.prob_empate,
      prob_visita: predicciones.prob_visita,
      goles_local: predicciones.goles_local,
      goles_visita: predicciones.goles_visita,
      recomendacion: recomendacion,
      
      // Métricas avanzadas
      xg_local: metricas.xG_local,
      xga_local: metricas.xGA_local,
      xg_visita: metricas.xG_visita,
      xga_visita: metricas.xGA_visita,
      forma_local: metricas.forma_local,
      forma_visita: metricas.forma_visita,
      racha_local: metricas.racha_local,
      racha_visita: metricas.racha_visita,
      rendimiento_local: metricas.rendimiento_local,
      rendimiento_visita: metricas.rendimiento_visita,
      promedio_goles_local_favor: metricas.promedio_goles_local?.a_favor,
      promedio_goles_local_contra: metricas.promedio_goles_local?.en_contra,
      promedio_goles_visita_favor: metricas.promedio_goles_visita?.a_favor,
      promedio_goles_visita_contra: metricas.promedio_goles_visita?.en_contra,
      
      // Resultado real (si está disponible)
      resultado_real: resultadoReal?.resultado || null, // 'W', 'D', 'L'
      goles_local_real: resultadoReal?.goles_local || null,
      goles_visita_real: resultadoReal?.goles_visita || null,
      tiene_resultado: resultadoReal !== null,
    };

    // Verificar si ya existe una entrada para este fixture
    const existingIndex = logs.findIndex(log => log.fixture_id === fixtureId);
    
    if (existingIndex >= 0) {
      // Actualizar entrada existente (útil si se agrega el resultado después)
      logs[existingIndex] = {
        ...logs[existingIndex],
        ...logEntry,
        // Mantener el timestamp original de la predicción
        timestamp: logs[existingIndex].timestamp,
        fecha_prediccion: logs[existingIndex].fecha_prediccion,
      };
    } else {
      // Agregar nueva entrada
      logs.push(logEntry);
    }

    // Guardar logs (operación asíncrona para no bloquear)
    setImmediate(() => {
      saveLogs(logs);
    });

    console.log(`✅ [LOGGING] Predicción registrada para fixture ${fixtureId}`);
  } catch (error) {
    console.error('❌ [LOGGING] Error registrando predicción:', error);
    // No lanzar error para no bloquear la respuesta
  }
}

/**
 * Obtener logs de un equipo específico
 * @param {number} teamId - ID del equipo
 * @returns {Array} - Array de logs del equipo
 */
function getLogsByTeam(teamId) {
  const logs = loadLogs();
  return logs.filter(log => 
    log.home_team_id === teamId || log.away_team_id === teamId
  );
}

/**
 * Obtener logs con resultados reales (para entrenamiento)
 * @returns {Array} - Array de logs con resultados
 */
function getLogsWithResults() {
  const logs = loadLogs();
  return logs.filter(log => log.tiene_resultado === true);
}

/**
 * Limpiar logs antiguos (más de N días)
 * @param {number} days - Días a mantener
 */
function cleanOldLogs(days = 90) {
  try {
    const logs = loadLogs();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const filteredLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= cutoffDate;
    });

    saveLogs(filteredLogs);
    console.log(`✅ [LOGGING] Logs limpiados: ${logs.length - filteredLogs.length} entradas eliminadas`);
  } catch (error) {
    console.error('❌ [LOGGING] Error limpiando logs:', error);
  }
}

module.exports = {
  logPrediction,
  getLogsByTeam,
  getLogsWithResults,
  cleanOldLogs,
  loadLogs,
};
