import { calculateAdvancedStats } from "./calculateAdvancedStats";

/**
 * Cruza los datos de dos equipos para generar comparaciones basadas en datos reales
 * @param {Object} datosEquipoA - Datos completos del equipo A
 * @param {Object} datosEquipoB - Datos completos del equipo B
 * @returns {Object} - Objeto con métricas comparadas basadas en datos reales
 */
export const cruzarDatosEquipos = (datosEquipoA, datosEquipoB) => {
  if (!datosEquipoA || !datosEquipoB) {
    return null;
  }

  // Calcular estadísticas avanzadas para ambos equipos
  const statsA = datosEquipoA.ultimosPartidos 
    ? calculateAdvancedStats(datosEquipoA.ultimosPartidos, datosEquipoA.id)
    : null;
  const statsB = datosEquipoB.ultimosPartidos 
    ? calculateAdvancedStats(datosEquipoB.ultimosPartidos, datosEquipoB.id)
    : null;

  // Promedios básicos
  const promedioGolesFavorA = parseFloat(datosEquipoA.promedioGolesFavor) || 0;
  const promedioGolesContraA = parseFloat(datosEquipoA.promedioGolesContra) || 0;
  const promedioGolesFavorB = parseFloat(datosEquipoB.promedioGolesFavor) || 0;
  const promedioGolesContraB = parseFloat(datosEquipoB.promedioGolesContra) || 0;

  // Promedios combinados
  const promedioCombinadoGolesAnotados = ((promedioGolesFavorA + promedioGolesFavorB) / 2).toFixed(2);
  const promedioCombinadoGolesRecibidos = ((promedioGolesContraA + promedioGolesContraB) / 2).toFixed(2);
  const promedioTotalGolesEsperados = parseFloat(promedioCombinadoGolesAnotados) + parseFloat(promedioCombinadoGolesRecibidos);

  // Diferencia de goles promedio
  const diferenciaGolesPromedio = (promedioGolesFavorA - promedioGolesFavorB).toFixed(2);
  const diferenciaDefensiva = (promedioGolesContraB - promedioGolesContraA).toFixed(2);

  // Forma reciente comparada
  let formaA = { ganados: 0, empatados: 0, perdidos: 0 };
  let formaB = { ganados: 0, empatados: 0, perdidos: 0 };

  if (datosEquipoA.ultimosPartidos) {
    datosEquipoA.ultimosPartidos.forEach(p => {
      if (p.resultado === "G") formaA.ganados++;
      else if (p.resultado === "E") formaA.empatados++;
      else formaA.perdidos++;
    });
  }

  if (datosEquipoB.ultimosPartidos) {
    datosEquipoB.ultimosPartidos.forEach(p => {
      if (p.resultado === "G") formaB.ganados++;
      else if (p.resultado === "E") formaB.empatados++;
      else formaB.perdidos++;
    });
  }

  const puntosFormaA = (formaA.ganados * 3) + formaA.empatados;
  const puntosFormaB = (formaB.ganados * 3) + formaB.empatados;
  const diferenciaForma = puntosFormaA - puntosFormaB;

  // Clean sheets y failed to score comparados
  const cleanSheetsA = statsA ? parseFloat(statsA.cleanSheetsPercentage) : 0;
  const cleanSheetsB = statsB ? parseFloat(statsB.cleanSheetsPercentage) : 0;
  const failedToScoreA = statsA ? parseFloat(statsA.failedToScorePercentage) : 0;
  const failedToScoreB = statsB ? parseFloat(statsB.failedToScorePercentage) : 0;

  // Over/Under comparado
  const over25A = statsA ? parseFloat(statsA.overUnder.over25) : 0;
  const over25B = statsB ? parseFloat(statsB.overUnder.over25) : 0;
  const promedioOver25 = ((over25A + over25B) / 2).toFixed(1);

  return {
    // Promedios combinados (datos reales)
    promedioCombinadoGolesAnotados: parseFloat(promedioCombinadoGolesAnotados),
    promedioCombinadoGolesRecibidos: parseFloat(promedioCombinadoGolesRecibidos),
    promedioTotalGolesEsperados: promedioTotalGolesEsperados.toFixed(2),
    
    // Diferencias (cálculos simples basados en datos reales)
    diferenciaGolesPromedio: parseFloat(diferenciaGolesPromedio),
    diferenciaDefensiva: parseFloat(diferenciaDefensiva),
    diferenciaForma: diferenciaForma,
    
    // Forma reciente (datos reales de últimos partidos)
    formaA,
    formaB,
    puntosFormaA,
    puntosFormaB,
    
    // Clean sheets y failed to score (estadísticas reales)
    cleanSheetsA,
    cleanSheetsB,
    failedToScoreA,
    failedToScoreB,
    
    // Over/Under (estadísticas reales)
    promedioOver25: parseFloat(promedioOver25),
    over25A,
    over25B
  };
};
