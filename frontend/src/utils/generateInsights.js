/**
 * Generador de Conclusiones de Análisis Profesional usando Sistema CID
 *
 * Orquesta el CID sin alterar umbrales; selección y textos en conclusionesCopy.
 */

import {
  detectarContextoPartido,
  generarConclusionProbabilidades,
  generarConclusionXG,
  generarConclusionGoles,
  generarConclusionRacha,
  generarConclusionForma,
  generarConclusionRendimiento,
  generarConclusionXGA,
  generarConclusionCorners,
  generarConclusionHistorial,
  generarConclusionClasico,
  generarConclusionTipoPartido,
  generarConclusionMotivacion,
  generarConclusionLigaDistinta,
  generarResumenEjecutivo,
  generarConclusionFinal,
} from './cidSystem';
import { seleccionarConclusionesCID } from './conclusionesCopy';

export function generateInsights(prediccion, metricas_avanzadas, datosAdicionales = {}) {
  if (!prediccion || !metricas_avanzadas) {
    return {
      conclusiones: [],
      resumenEjecutivo: [],
      conclusionFinal: null,
      contexto: null,
    };
  }

  const contexto = detectarContextoPartido(prediccion, metricas_avanzadas, datosAdicionales);
  const conclusiones = [];

  const pushSi = (c) => {
    if (c) conclusiones.push(c);
  };

  pushSi(generarConclusionMotivacion(contexto, datosAdicionales));
  pushSi(generarConclusionLigaDistinta(datosAdicionales));
  pushSi(generarConclusionClasico(contexto));
  pushSi(generarConclusionTipoPartido(contexto, datosAdicionales));
  pushSi(generarConclusionHistorial(contexto, datosAdicionales));
  pushSi(generarConclusionProbabilidades(prediccion, contexto, datosAdicionales));
  pushSi(generarConclusionXG(metricas_avanzadas, contexto, datosAdicionales));
  pushSi(generarConclusionXGA(metricas_avanzadas, contexto, datosAdicionales));
  pushSi(generarConclusionGoles(prediccion, contexto));
  pushSi(generarConclusionRacha(metricas_avanzadas, contexto, datosAdicionales));
  pushSi(generarConclusionForma(metricas_avanzadas, contexto, datosAdicionales));
  pushSi(generarConclusionRendimiento(metricas_avanzadas, contexto, datosAdicionales));
  pushSi(generarConclusionCorners(metricas_avanzadas, contexto));

  const prioridad = { ventaja: 1, tendencia: 2, 'dato clave': 3, riesgo: 4, alerta: 5 };
  conclusiones.sort((a, b) => (prioridad[a.tipo] || 99) - (prioridad[b.tipo] || 99));

  const conclusionesPrincipales = seleccionarConclusionesCID(conclusiones, 4);

  const resumenEjecutivo = generarResumenEjecutivo(
    prediccion,
    metricas_avanzadas,
    contexto,
    datosAdicionales
  );

  const conclusionFinal = generarConclusionFinal(
    prediccion,
    metricas_avanzadas,
    contexto,
    conclusionesPrincipales,
    datosAdicionales
  );

  return {
    conclusiones: conclusionesPrincipales,
    resumenEjecutivo,
    conclusionFinal,
    contexto,
  };
}

export function generateInsightsLegacy(prediccion, metricas_avanzadas) {
  const resultado = generateInsights(prediccion, metricas_avanzadas);
  return resultado.conclusiones || [];
}
