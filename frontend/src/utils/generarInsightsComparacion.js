import {
  CONCLUSIONES_COMPARADOR_PARTIDOS_BASE,
  textoAtaque,
  textoDefensa,
  textoBalance,
  textoMomentoBueno,
  textoTipoOfensivo,
  textoTipoEquilibrado,
  textoEficacia,
  textoGlobal,
  seleccionarConclusiones,
  aTextosPlano,
} from './conclusionesCopy';

/**
 * Genera conclusiones para comparación entre dos partidos.
 * Umbrales sin cambios; textos y selección desde el catálogo unificado.
 * @returns {string[]}
 */
export function generarInsightsComparacion(partidoA, partidoB) {
  if (!partidoA || !partidoB) {
    return [CONCLUSIONES_COMPARADOR_PARTIDOS_BASE];
  }

  const candidatos = [];
  const metricasA = partidoA.metricas_avanzadas || {};
  const metricasB = partidoB.metricas_avanzadas || {};

  if (partidoA.prob_local !== undefined && partidoB.prob_local !== undefined) {
    const diferenciaProbLocal = (partidoA.prob_local - partidoB.prob_local) * 100;
    if (Math.abs(diferenciaProbLocal) > 15) {
      if (diferenciaProbLocal > 0) {
        candidatos.push({
          categoria: 'global',
          texto: textoGlobal('el local del partido A'),
        });
      } else {
        candidatos.push({
          categoria: 'global',
          texto: textoGlobal('el local del partido B'),
        });
      }
    } else {
      candidatos.push({ categoria: 'balance', texto: textoTipoEquilibrado() });
    }
  }

  if (metricasA.xG_local && metricasB.xG_local) {
    const diferenciaXG = metricasA.xG_local - metricasB.xG_local;
    if (Math.abs(diferenciaXG) > 0.3) {
      const equipo = diferenciaXG > 0 ? 'el local del partido A' : 'el local del partido B';
      candidatos.push({ categoria: 'ataque', texto: textoAtaque(equipo) });
    }
  }

  if (metricasA.xGA_local && metricasB.xGA_local) {
    const diferenciaXGA = metricasA.xGA_local - metricasB.xGA_local;
    if (Math.abs(diferenciaXGA) > 0.3) {
      if (diferenciaXGA < 0) {
        candidatos.push({ categoria: 'defensa', texto: textoDefensa('el local del partido A') });
      } else {
        candidatos.push({ categoria: 'defensa', texto: textoDefensa('el local del partido B') });
      }
    }
  }

  if (metricasA.xG_local && metricasA.xGA_local && metricasB.xG_local && metricasB.xGA_local) {
    const equilibrioA = Math.abs(metricasA.xG_local - metricasA.xGA_local);
    const equilibrioB = Math.abs(metricasB.xG_local - metricasB.xGA_local);

    if (equilibrioB < equilibrioA - 0.2) {
      candidatos.push({ categoria: 'balance', texto: textoBalance('el local del partido B') });
    } else if (equilibrioA < equilibrioB - 0.2) {
      candidatos.push({ categoria: 'balance', texto: textoBalance('el local del partido A') });
    }
  }

  if (metricasA.forma_local && metricasB.forma_local) {
    const calcularPuntosForma = (formaStr) => {
      if (!formaStr || formaStr === 'N/A') return 0;
      let puntos = 0;
      for (const char of formaStr) {
        if (char === 'W') puntos += 3;
        else if (char === 'D') puntos += 1;
      }
      return puntos;
    };

    const diferencia = calcularPuntosForma(metricasA.forma_local) - calcularPuntosForma(metricasB.forma_local);

    if (Math.abs(diferencia) > 4) {
      const equipo = diferencia > 0 ? 'el local del partido A' : 'el local del partido B';
      candidatos.push({ categoria: 'momento', texto: textoMomentoBueno(equipo) });
    }
  }

  if (metricasA.racha_local !== undefined && metricasB.racha_local !== undefined) {
    const diferenciaRacha = metricasA.racha_local - metricasB.racha_local;
    if (Math.abs(diferenciaRacha) >= 2) {
      const equipo = diferenciaRacha > 0 ? 'el local del partido A' : 'el local del partido B';
      candidatos.push({ categoria: 'momento', texto: textoMomentoBueno(equipo) });
    }
  }

  if (metricasA.rendimiento_local && metricasB.rendimiento_local) {
    const diferenciaRendimiento = metricasA.rendimiento_local - metricasB.rendimiento_local;
    if (Math.abs(diferenciaRendimiento) > 10) {
      const equipo = diferenciaRendimiento > 0 ? 'el local del partido A' : 'el local del partido B';
      candidatos.push({ categoria: 'tabla', texto: textoGlobal(equipo) });
    }
  }

  if (partidoA.recomendacion && partidoB.recomendacion) {
    if (partidoA.recomendacion !== partidoB.recomendacion) {
      candidatos.push({
        categoria: 'tipo',
        texto: `Las lecturas difieren: partido A («${partidoA.recomendacion}») y partido B («${partidoB.recomendacion}»).`,
      });
    }
  }

  if (partidoA.goles_local && partidoB.goles_local) {
    const totalGolesA = partidoA.goles_local + partidoA.goles_visita;
    const totalGolesB = partidoB.goles_local + partidoB.goles_visita;
    const diferencia = totalGolesA - totalGolesB;

    if (Math.abs(diferencia) > 0.5) {
      candidatos.push({ categoria: 'tipo', texto: textoTipoOfensivo() });
    }
  }

  const elegidas = seleccionarConclusiones(candidatos, 4);
  if (elegidas.length === 0) {
    return [CONCLUSIONES_COMPARADOR_PARTIDOS_BASE];
  }

  return aTextosPlano(elegidas);
}
