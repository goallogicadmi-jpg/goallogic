/**
 * Sistema de Conclusiones Inteligentes Dinámicas (CID)
 *
 * Umbrales y detección de contexto sin cambios; textos desde conclusionesCopy.js
 */

import {
  pick,
  PLANTILLAS,
  textoAtaque,
  textoDefensa,
  textoBalance,
  textoMomentoBueno,
  textoMomentoMalo,
  textoTabla,
  textoLigaDistinta,
  textoTipoOfensivo,
  textoTipoCerrado,
  textoTipoEquilibrado,
  textoGlobal,
  textoGlobalDetalles,
  seleccionarConclusiones,
  aTextosPlano,
} from './conclusionesCopy';

function nombreEquipo(datosAdicionales, lado) {
  if (lado === 'local') {
    return datosAdicionales?.nombreLocal || datosAdicionales?.equipoLocal || 'el local';
  }
  return datosAdicionales?.nombreVisita || datosAdicionales?.equipoVisita || 'el visitante';
}

/**
 * Detecta el contexto del partido para adaptar las conclusiones
 * @param {Object} prediccion - Datos de predicción
 * @param {Object} metricas_avanzadas - Métricas avanzadas
 * @param {Object} datosAdicionales - Datos adicionales (nombres equipos, esClasico, historial, etc.)
 * @returns {Object} Contexto detectado del partido
 */
export function detectarContextoPartido(prediccion, metricas_avanzadas, datosAdicionales = {}) {
  const contexto = {
    tipoPartido: 'normal', // 'normal', 'clasico', 'desigual', 'parejo', 'crisis', 'rachafuerte'
    diferenciaNivel: 'equilibrado', // 'equilibrado', 'ligera', 'moderada', 'marcada'
    importancia: 'normal', // 'normal', 'alta', 'crucial'
    localiaDeterminante: false,
    rachaFuerte: null, // 'local', 'visita', null
    crisis: null, // 'local', 'visita', null
    partidoParejo: true,
    ventajaClara: null, // 'local', 'visita', null
    esClasico: datosAdicionales?.esClasico || false,
    historialFavorable: null // 'local', 'visita', null
  };

  // Detectar diferencia de nivel
  if (prediccion?.prob_local && prediccion?.prob_visita) {
    const diferenciaProb = Math.abs((prediccion.prob_local - prediccion.prob_visita) * 100);
    if (diferenciaProb < 10) {
      contexto.diferenciaNivel = 'equilibrado';
      contexto.partidoParejo = true;
      contexto.tipoPartido = 'parejo';
    } else if (diferenciaProb < 20) {
      contexto.diferenciaNivel = 'ligera';
      contexto.partidoParejo = true;
    } else if (diferenciaProb < 30) {
      contexto.diferenciaNivel = 'moderada';
      contexto.partidoParejo = false;
      contexto.tipoPartido = 'desigual';
    } else {
      contexto.diferenciaNivel = 'marcada';
      contexto.partidoParejo = false;
      contexto.tipoPartido = 'desigual';
      contexto.ventajaClara = prediccion.prob_local > prediccion.prob_visita ? 'local' : 'visita';
    }
  }

  // Detectar rachas fuertes
  if (metricas_avanzadas?.racha_local >= 5) {
    contexto.rachaFuerte = 'local';
    contexto.tipoPartido = 'rachafuerte';
  } else if (metricas_avanzadas?.racha_visita >= 5) {
    contexto.rachaFuerte = 'visita';
    contexto.tipoPartido = 'rachafuerte';
  }

  // Detectar crisis (rachas negativas)
  if (metricas_avanzadas?.racha_local <= -3) {
    contexto.crisis = 'local';
    contexto.tipoPartido = 'crisis';
  } else if (metricas_avanzadas?.racha_visita <= -3) {
    contexto.crisis = 'visita';
    contexto.tipoPartido = 'crisis';
  }

  // Detectar si la localía es determinante
  if (metricas_avanzadas?.rendimiento_local && metricas_avanzadas?.rendimiento_visita) {
    const diferenciaRendimiento = metricas_avanzadas.rendimiento_local - metricas_avanzadas.rendimiento_visita;
    contexto.localiaDeterminante = diferenciaRendimiento >= 25;
  }

  // Detectar importancia del partido
  if (prediccion?.prob_local && prediccion?.prob_empate && prediccion?.prob_visita) {
    const maxProb = Math.max(prediccion.prob_local, prediccion.prob_empate, prediccion.prob_visita);
    if (maxProb < 45) {
      contexto.importancia = 'alta'; // Partido muy abierto
    } else if (maxProb > 70) {
      contexto.importancia = 'normal';
    }
  }

  // Detectar historial favorable
  if (datosAdicionales?.historialFavorable) {
    contexto.historialFavorable = datosAdicionales.historialFavorable;
  }

  return contexto;
}

/**
 * Genera conclusión sobre probabilidades del modelo Poisson
 */
export function generarConclusionProbabilidades(prediccion, contexto, datosAdicionales = {}) {
  if (!prediccion?.prob_local || !prediccion?.prob_empate || !prediccion?.prob_visita) {
    return null;
  }

  const probLocal = prediccion.prob_local * 100;
  const probVisita = prediccion.prob_visita * 100;
  const probEmpate = prediccion.prob_empate * 100;
  const maxProb = Math.max(probLocal, probEmpate, probVisita);

  if (maxProb === probLocal && probLocal >= 55) {
    return {
      tipo: 'ventaja',
      icono: '📈',
      categoria: 'global',
      texto: textoGlobal(nombreEquipo(datosAdicionales, 'local')),
    };
  }
  if (maxProb === probVisita && probVisita >= 55) {
    return {
      tipo: 'ventaja',
      icono: '📈',
      categoria: 'global',
      texto: textoGlobal(nombreEquipo(datosAdicionales, 'visita')),
    };
  }
  if (maxProb === probEmpate && probEmpate >= 35) {
    return {
      tipo: 'tendencia',
      icono: '⚽',
      categoria: 'balance',
      texto: textoTipoEquilibrado(),
    };
  }

  return null;
}

/**
 * Genera conclusión sobre xG normalizado (CATÁLOGO PROFESIONAL - 5 variaciones)
 */
export function generarConclusionXG(metricas_avanzadas, contexto, datosAdicionales = {}) {
  if (!metricas_avanzadas?.xG_local || !metricas_avanzadas?.xG_visita) {
    return null;
  }

  const diferenciaXG = metricas_avanzadas.xG_local - metricas_avanzadas.xG_visita;

  if (diferenciaXG > 0.4) {
    return {
      tipo: 'ventaja',
      icono: '📊',
      categoria: 'ataque',
      texto: textoAtaque(nombreEquipo(datosAdicionales, 'local')),
    };
  }
  if (diferenciaXG < -0.4) {
    return {
      tipo: 'ventaja',
      icono: '📊',
      categoria: 'ataque',
      texto: textoAtaque(nombreEquipo(datosAdicionales, 'visita')),
    };
  }

  return null;
}

/**
 * Genera conclusión sobre xGA (defensa) (CATÁLOGO PROFESIONAL - 5 variaciones)
 */
export function generarConclusionXGA(metricas_avanzadas, contexto, datosAdicionales = {}) {
  if (!metricas_avanzadas?.xGA_local || !metricas_avanzadas?.xGA_visita) {
    return null;
  }

  const diferenciaXGA = metricas_avanzadas.xGA_local - metricas_avanzadas.xGA_visita;

  if (diferenciaXGA < -0.3) {
    return {
      tipo: 'ventaja',
      icono: '📊',
      categoria: 'defensa',
      texto: textoDefensa(nombreEquipo(datosAdicionales, 'local')),
    };
  }
  if (diferenciaXGA > 0.3) {
    return {
      tipo: 'riesgo',
      icono: '⚠️',
      categoria: 'defensa',
      texto: textoDefensa(nombreEquipo(datosAdicionales, 'visita')),
    };
  }

  return null;
}

/**
 * Genera conclusión sobre goles esperados
 */
export function generarConclusionGoles(prediccion, contexto) {
  if (!prediccion?.goles_local || !prediccion?.goles_visita) {
    return null;
  }

  const totalGoles = prediccion.goles_local + prediccion.goles_visita;

  if (totalGoles > 2.8) {
    return {
      tipo: 'tendencia',
      icono: '⚽',
      categoria: 'tipo',
      texto: textoTipoOfensivo(),
    };
  }
  if (totalGoles < 2.0) {
    return {
      tipo: 'tendencia',
      icono: '⚽',
      categoria: 'tipo',
      texto: textoTipoCerrado(),
    };
  }

  return null;
}

/**
 * Genera conclusión sobre rachas (CATÁLOGO PROFESIONAL - 5 variaciones)
 */
export function generarConclusionRacha(metricas_avanzadas, contexto, datosAdicionales = {}) {
  if (metricas_avanzadas?.racha_local === undefined || metricas_avanzadas?.racha_visita === undefined) {
    return null;
  }

  const rachaLocal = metricas_avanzadas.racha_local || 0;
  const rachaVisita = metricas_avanzadas.racha_visita || 0;

  if (rachaLocal >= 4) {
    return {
      tipo: 'ventaja',
      icono: '📈',
      categoria: 'momento',
      texto: textoMomentoBueno(nombreEquipo(datosAdicionales, 'local')),
    };
  }
  if (rachaVisita >= 4) {
    return {
      tipo: 'riesgo',
      icono: '⚠️',
      categoria: 'momento',
      texto: textoMomentoBueno(nombreEquipo(datosAdicionales, 'visita')),
    };
  }

  return null;
}

/**
 * Genera conclusión sobre forma reciente (CATÁLOGO PROFESIONAL - 5 variaciones)
 */
export function generarConclusionForma(metricas_avanzadas, contexto, datosAdicionales = {}) {
  if (!metricas_avanzadas?.forma_local || !metricas_avanzadas?.forma_visita) {
    return null;
  }

  const calcularPuntosForma = (formaStr) => {
    if (!formaStr || formaStr === 'N/A') return 0;
    let puntos = 0;
    for (const char of formaStr) {
      if (char === 'W') puntos += 3;
      else if (char === 'D') puntos += 1;
    }
    return puntos;
  };

  const puntosLocal = calcularPuntosForma(metricas_avanzadas.forma_local);
  const puntosVisita = calcularPuntosForma(metricas_avanzadas.forma_visita);
  const diferencia = puntosLocal - puntosVisita;

  if (diferencia >= 6) {
    return {
      tipo: 'ventaja',
      icono: '📈',
      categoria: 'momento',
      texto: textoMomentoBueno(nombreEquipo(datosAdicionales, 'local')),
    };
  }
  if (diferencia <= -6) {
    return {
      tipo: 'riesgo',
      icono: '⚠️',
      categoria: 'momento',
      texto: textoMomentoBueno(nombreEquipo(datosAdicionales, 'visita')),
    };
  }

  return null;
}

/**
 * Genera conclusión sobre rendimiento histórico (CATÁLOGO PROFESIONAL - 5 variaciones)
 */
export function generarConclusionRendimiento(metricas_avanzadas, contexto, datosAdicionales = {}) {
  if (!metricas_avanzadas?.rendimiento_local || !metricas_avanzadas?.rendimiento_visita) {
    return null;
  }

  const diferenciaRendimiento = metricas_avanzadas.rendimiento_local - metricas_avanzadas.rendimiento_visita;

  if (diferenciaRendimiento >= 20) {
    return {
      tipo: 'ventaja',
      icono: '📊',
      categoria: 'tabla',
      texto: textoTabla(nombreEquipo(datosAdicionales, 'local')),
    };
  }
  if (diferenciaRendimiento <= -20) {
    return {
      tipo: 'riesgo',
      icono: '⚠️',
      categoria: 'tabla',
      texto: textoTabla(nombreEquipo(datosAdicionales, 'visita')),
    };
  }

  return null;
}

/**
 * Genera conclusión sobre historial entre equipos (CATÁLOGO PROFESIONAL - 5 variaciones)
 */
export function generarConclusionHistorial(contexto, datosAdicionales = {}) {
  if (!contexto.historialFavorable) {
    return null;
  }

  const lado = contexto.historialFavorable;
  return {
    tipo: 'ventaja',
    icono: '📊',
    categoria: 'tabla',
    texto: pick([PLANTILLAS.F_TABLA[0]], { equipo: nombreEquipo(datosAdicionales, lado) }),
  };
}

/**
 * Genera conclusión sobre clásicos/rivalidades (CATÁLOGO PROFESIONAL - 5 variaciones)
 */
export function generarConclusionClasico(contexto) {
  if (!contexto.esClasico) {
    return null;
  }

  return {
    tipo: 'alerta',
    icono: '⚽',
    categoria: 'tipo',
    texto: textoTipoEquilibrado(),
  };
}

/**
 * Genera conclusión sobre partido parejo/desigual (CATÁLOGO PROFESIONAL)
 */
export function generarConclusionTipoPartido(contexto, datosAdicionales = {}) {
  if (contexto.partidoParejo && contexto.diferenciaNivel === 'equilibrado') {
    return {
      tipo: 'tendencia',
      icono: '⚖️',
      categoria: 'balance',
      texto: textoTipoEquilibrado(),
    };
  }
  if (!contexto.partidoParejo && contexto.ventajaClara) {
    return {
      tipo: 'ventaja',
      icono: '📊',
      categoria: 'global',
      texto: textoGlobal(nombreEquipo(datosAdicionales, contexto.ventajaClara)),
    };
  }

  return null;
}

/** Motivación / urgencia (usa crisis y racha fuerte ya detectadas en contexto) */
export function generarConclusionMotivacion(contexto, datosAdicionales = {}) {
  if (contexto.crisis === 'local') {
    return {
      tipo: 'alerta',
      icono: '🔥',
      categoria: 'motivacion',
      texto: pick([PLANTILLAS.E_URGENCIA[3]], { equipo: nombreEquipo(datosAdicionales, 'local') }),
    };
  }
  if (contexto.crisis === 'visita') {
    return {
      tipo: 'alerta',
      icono: '🔥',
      categoria: 'motivacion',
      texto: pick([PLANTILLAS.E_URGENCIA[3]], { equipo: nombreEquipo(datosAdicionales, 'visita') }),
    };
  }
  if (contexto.rachaFuerte === 'local') {
    return {
      tipo: 'ventaja',
      icono: '🔥',
      categoria: 'motivacion',
      texto: pick([PLANTILLAS.E_URGENCIA[4]], { equipo: nombreEquipo(datosAdicionales, 'local') }),
    };
  }
  if (contexto.rachaFuerte === 'visita') {
    return {
      tipo: 'ventaja',
      icono: '🔥',
      categoria: 'motivacion',
      texto: pick([PLANTILLAS.E_URGENCIA[4]], { equipo: nombreEquipo(datosAdicionales, 'visita') }),
    };
  }

  return null;
}

/** Ligas distintas (solo si viene indicado en datos adicionales) */
export function generarConclusionLigaDistinta(datosAdicionales = {}) {
  if (!datosAdicionales?.ligasDistintas && !datosAdicionales?.ligaDistinta) {
    return null;
  }

  return {
    tipo: 'dato clave',
    icono: '🌍',
    categoria: 'liga',
    texto: textoLigaDistinta(),
  };
}

/**
 * Genera conclusión sobre corners esperados
 */
export function generarConclusionCorners(metricas_avanzadas, contexto) {
  if (metricas_avanzadas?.promedio_corners_esperados === null || metricas_avanzadas?.promedio_corners_esperados === undefined) {
    return null;
  }

  const corners = Number(metricas_avanzadas.promedio_corners_esperados);

  if (corners > 11) {
    return {
      tipo: 'alerta',
      icono: '⚠️',
      categoria: 'tipo',
      texto: textoTipoOfensivo(),
    };
  }
  if (corners < 8) {
    return {
      tipo: 'dato clave',
      icono: '📊',
      categoria: 'tipo',
      texto: textoTipoCerrado(),
    };
  }

  return null;
}

/**
 * Genera resumen ejecutivo premium (3-5 conclusiones clave)
 */
export function generarResumenEjecutivo(prediccion, metricas_avanzadas, contexto, datosAdicionales = {}) {
  const candidatos = [];

  const motivacion = generarConclusionMotivacion(contexto, datosAdicionales);
  if (motivacion) candidatos.push({ ...motivacion, texto: motivacion.texto });

  if (prediccion?.prob_local && prediccion?.prob_visita) {
    const probLocal = prediccion.prob_local * 100;
    const probVisita = prediccion.prob_visita * 100;
    const maxProb = Math.max(probLocal, probVisita);
    if (maxProb === probLocal && probLocal >= 55) {
      candidatos.push({ categoria: 'global', texto: textoGlobal(nombreEquipo(datosAdicionales, 'local')) });
    } else if (maxProb === probVisita && probVisita >= 55) {
      candidatos.push({ categoria: 'global', texto: textoGlobal(nombreEquipo(datosAdicionales, 'visita')) });
    } else {
      candidatos.push({ categoria: 'balance', texto: textoTipoEquilibrado() });
    }
  }

  if (metricas_avanzadas?.forma_local && metricas_avanzadas?.forma_visita) {
    const calcularPuntosForma = (formaStr) => {
      if (!formaStr || formaStr === 'N/A') return 0;
      let puntos = 0;
      for (const char of formaStr) {
        if (char === 'W') puntos += 3;
        else if (char === 'D') puntos += 1;
      }
      return puntos;
    };
    const diferencia = calcularPuntosForma(metricas_avanzadas.forma_local) - calcularPuntosForma(metricas_avanzadas.forma_visita);
    if (diferencia >= 6) {
      candidatos.push({ categoria: 'momento', texto: textoMomentoBueno(nombreEquipo(datosAdicionales, 'local')) });
    } else if (diferencia <= -6) {
      candidatos.push({ categoria: 'momento', texto: textoMomentoBueno(nombreEquipo(datosAdicionales, 'visita')) });
    }
  }

  if (prediccion?.goles_local && prediccion?.goles_visita) {
    const totalGoles = prediccion.goles_local + prediccion.goles_visita;
    if (totalGoles > 2.8) {
      candidatos.push({ categoria: 'tipo', texto: textoTipoOfensivo() });
    } else if (totalGoles < 2.0) {
      candidatos.push({ categoria: 'tipo', texto: textoTipoCerrado() });
    }
  }

  return aTextosPlano(seleccionarConclusiones(candidatos, 3));
}

/**
 * Genera conclusión final tipo analista (CATÁLOGO PROFESIONAL - 5 variaciones)
 */
export function generarConclusionFinal(prediccion, metricas_avanzadas, contexto, conclusiones, datosAdicionales = {}) {
  if (contexto.partidoParejo && contexto.diferenciaNivel === 'equilibrado') {
    return textoGlobalDetalles();
  }
  if (contexto.ventajaClara === 'local') {
    return textoGlobal(nombreEquipo(datosAdicionales, 'local'));
  }
  if (contexto.ventajaClara === 'visita') {
    return textoGlobal(nombreEquipo(datosAdicionales, 'visita'));
  }

  const favLocal = conclusiones.filter((c) => c.tipo === 'ventaja').length;
  const favVisita = conclusiones.filter((c) => c.tipo === 'riesgo').length;

  if (favLocal > favVisita) {
    return textoGlobal(nombreEquipo(datosAdicionales, 'local'));
  }
  if (favVisita > favLocal) {
    return textoGlobal(nombreEquipo(datosAdicionales, 'visita'));
  }

  return pick(PLANTILLAS.J_GLOBAL);
}
