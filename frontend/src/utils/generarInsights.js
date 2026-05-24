/**
 * Genera insights automáticos basados en las métricas del partido
 * @param {Object} metricas - Métricas avanzadas del partido
 * @returns {Array<string>} - Array de frases de insights
 */
export function generarInsights(metricas) {
  if (!metricas) return [];

  const insights = [];

  // Insight sobre xG
  if (metricas.xG_local && metricas.xG_visita) {
    const diferenciaXG = metricas.xG_local - metricas.xG_visita;
    if (diferenciaXG > 0.5) {
      insights.push(`El equipo local tiene un xG superior (${metricas.xG_local.toFixed(2)} vs ${metricas.xG_visita.toFixed(2)}), indicando mayor capacidad ofensiva.`);
    } else if (diferenciaXG < -0.5) {
      insights.push(`El equipo visitante muestra un xG superior (${metricas.xG_visita.toFixed(2)} vs ${metricas.xG_local.toFixed(2)}), sugiriendo mejor rendimiento ofensivo.`);
    } else {
      insights.push(`Los equipos muestran un xG similar, indicando un partido equilibrado en términos ofensivos.`);
    }
  }

  // Insight sobre xGA
  if (metricas.xGA_local && metricas.xGA_visita) {
    const diferenciaXGA = metricas.xGA_local - metricas.xGA_visita;
    if (diferenciaXGA > 0.3) {
      insights.push(`El equipo local tiene un xGA más alto (${metricas.xGA_local.toFixed(2)}), lo que sugiere una defensa más vulnerable.`);
    } else if (diferenciaXGA < -0.3) {
      insights.push(`El equipo visitante tiene un xGA más alto (${metricas.xGA_visita.toFixed(2)}), indicando mayor exposición defensiva.`);
    }
  }

  // Insight sobre forma reciente
  if (metricas.forma_local && metricas.forma_visita) {
    const calcularPuntosForma = (formaStr) => {
      if (!formaStr || formaStr === 'N/A') return 0;
      let puntos = 0;
      for (const char of formaStr) {
        if (char === 'W') puntos += 3;
        else if (char === 'D') puntos += 1;
      }
      return puntos;
    };

    const puntosLocal = calcularPuntosForma(metricas.forma_local);
    const puntosVisita = calcularPuntosForma(metricas.forma_visita);
    const diferencia = puntosLocal - puntosVisita;

    if (diferencia > 4) {
      insights.push(`La forma reciente del equipo local es significativamente mejor (${metricas.forma_local} vs ${metricas.forma_visita}), mostrando momentum positivo.`);
    } else if (diferencia < -4) {
      insights.push(`La forma reciente del visitante es superior (${metricas.forma_visita} vs ${metricas.forma_local}), indicando mejor rendimiento actual.`);
    } else if (puntosLocal < 3 && puntosVisita < 3) {
      insights.push(`Ambos equipos muestran forma reciente negativa, lo que podría indicar un partido impredecible.`);
    }
  }

  // Insight sobre rachas
  if (metricas.racha_local !== undefined && metricas.racha_visita !== undefined) {
    if (metricas.racha_local >= 3) {
      insights.push(`El equipo local mantiene una racha positiva de ${metricas.racha_local} partidos, indicando momentum y confianza.`);
    }
    if (metricas.racha_visita >= 3) {
      insights.push(`El equipo visitante lleva ${metricas.racha_visita} partidos sin perder, mostrando consistencia reciente.`);
    }
    if (metricas.racha_local === 0 && metricas.racha_visita === 0) {
      insights.push(`Ningún equipo muestra una racha positiva significativa, sugiriendo resultados inconsistentes.`);
    }
  }

  // Insight sobre rendimiento
  if (metricas.rendimiento_local && metricas.rendimiento_visita) {
    const diferenciaRendimiento = metricas.rendimiento_local - metricas.rendimiento_visita;
    if (diferenciaRendimiento > 15) {
      insights.push(`El rendimiento del equipo local es notablemente superior (${metricas.rendimiento_local.toFixed(1)}% vs ${metricas.rendimiento_visita.toFixed(1)}%), aprovechando la ventaja de jugar en casa.`);
    } else if (diferenciaRendimiento < -15) {
      insights.push(`El equipo visitante muestra mejor rendimiento histórico (${metricas.rendimiento_visita.toFixed(1)}% vs ${metricas.rendimiento_local.toFixed(1)}%), a pesar de jugar fuera.`);
    }
  }

  // Insight sobre promedio de goles
  if (metricas.promedio_goles_local && metricas.promedio_goles_visita) {
    const promedioLocalFavor = metricas.promedio_goles_local.a_favor || 0;
    const promedioVisitaFavor = metricas.promedio_goles_visita.a_favor || 0;
    const promedioLocalContra = metricas.promedio_goles_local.en_contra || 0;
    const promedioVisitaContra = metricas.promedio_goles_visita.en_contra || 0;

    if (promedioLocalFavor > promedioVisitaFavor + 0.5) {
      insights.push(`El equipo local anota más goles en promedio (${promedioLocalFavor.toFixed(2)} vs ${promedioVisitaFavor.toFixed(2)}), mostrando mayor capacidad goleadora.`);
    }

    if (promedioLocalContra < promedioVisitaContra - 0.3) {
      insights.push(`El equipo local recibe menos goles en promedio (${promedioLocalContra.toFixed(2)} vs ${promedioVisitaContra.toFixed(2)}), indicando una defensa más sólida.`);
    }

    // Insight sobre partidos con muchos goles
    const promedioTotal = (promedioLocalFavor + promedioVisitaFavor) / 2;
    if (promedioTotal > 2.5) {
      insights.push(`Ambos equipos muestran promedios altos de goles (${promedioTotal.toFixed(2)}), sugiriendo un partido con potencial ofensivo.`);
    }
  }

  // Si no hay insights, agregar uno genérico
  if (insights.length === 0) {
    insights.push(`Analiza las métricas detalladas arriba para obtener una visión completa del partido.`);
  }

  return insights;
}
