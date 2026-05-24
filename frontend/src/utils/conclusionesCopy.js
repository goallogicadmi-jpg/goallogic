/**
 * Catálogo y selección de textos para «Conclusiones de análisis».
 * No altera umbrales ni motores; solo plantillas y priorización de salida.
 */

// ─── Mensajes base ───────────────────────────────────────────────────────────

export const CONCLUSIONES_MENSAJE_BASE =
  'Las métricas no marcan un favorito claro. Revisa ataque, defensa y forma antes de decidir.';

export const CONCLUSIONES_CID_MENSAJE_BASE = {
  tipo: 'dato clave',
  icono: '📊',
  categoria: 'base',
  texto: CONCLUSIONES_MENSAJE_BASE,
};

export const CONCLUSIONES_COMPARADOR_PARTIDOS_BASE =
  'Ambos partidos se leen parejos en lo esencial. Contrasta probabilidades, xG y forma para elegir el escenario más claro.';

// ─── Categorías (orden de prioridad en selección) ────────────────────────────

export const CATEGORIA_PRIORIDAD = {
  motivacion: 1,
  tabla: 1,
  liga: 2,
  balance: 2,
  momento: 3,
  ataque: 4,
  defensa: 4,
  tipo: 4,
  eficacia: 4,
  global: 5,
  base: 99,
};

const MAX_CONCLUSIONES = 4;

/** Elige una plantilla al azar y sustituye {variables} */
export function pick(templates, variables = {}) {
  const template = templates[Math.floor(Math.random() * templates.length)];
  return Object.entries(variables).reduce(
    (texto, [key, value]) => texto.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
    template
  );
}

// ─── Plantillas A–J ──────────────────────────────────────────────────────────

export const PLANTILLAS = {
  A_ATAQUE: [
    '{equipo} tiene un xG más alto (goles esperados), lo que indica que genera ocasiones de mayor calidad.',
    'El xG favorece a {equipo}; crea situaciones que estadísticamente se convierten más en gol.',
    '{equipo} produce más peligro real según el xG; su ataque llega con más claridad.',
  ],
  B_DEFENSA: [
    '{equipo} tiene un xGA más bajo (peligro concedido), mostrando una defensa más sólida.',
    'El xGA favorece a {equipo}; concede menos ocasiones claras que su rival.',
    '{equipo} limita mejor el peligro según el xGA; controla mejor los espacios defensivos.',
  ],
  C_BALANCE: [
    '{equipo} combina mejor ataque (xG) y defensa (xGA); llega más equilibrado.',
    '{equipo} genera más peligro y concede menos; su balance xG/xGA es superior.',
    'El diferencial xG/xGA favorece a {equipo}; controla mejor ambas áreas.',
  ],
  D_MOMENTO_BUENO: [
    '{equipo} llega en mejor momento; su forma reciente respalda un rendimiento más estable.',
    'La racha de {equipo} refleja confianza y continuidad en el juego.',
  ],
  D_MOMENTO_MALO: [
    '{equipo} atraviesa un tramo irregular; necesita ajustar para competir mejor.',
  ],
  E_URGENCIA: [
    '{equipo} necesita puntos para salir de zona de descenso.',
    '{equipo} juega por clasificación a la siguiente fase; llega con urgencia por sumar.',
    '{equipo} compite por cupos internacionales; cada punto pesa más en este tramo.',
    '{equipo} viene de derrotas recientes y necesita recuperar sensaciones.',
    '{equipo} llega con confianza tras victorias clave en su objetivo competitivo.',
  ],
  F_TABLA: [
    'La diferencia en la tabla favorece a {equipo}; llega con más estabilidad.',
    '{equipo} está por encima en la clasificación, pero la distancia es corta; partido clave.',
    '{equipo} necesita sumar para no perder contacto con los puestos altos.',
    '{equipo} está en zona comprometida; juega con presión competitiva.',
  ],
  G_LIGA: [
    'Los equipos provienen de ligas distintas; las métricas deben interpretarse con cautela.',
    'El nivel competitivo de cada liga influye; el xG/xGA puede no ser directamente comparable.',
  ],
  H_TIPO: [
    'El partido apunta a ser ofensivo; ambos equipos generan ocasiones con frecuencia.',
    'Se espera un duelo cerrado; las defensas pesan más que los ataques.',
    'Las métricas anticipan un partido equilibrado, donde los detalles marcarán diferencias.',
  ],
  I_EFICACIA: [
    '{equipo} es más eficaz de cara al gol; convierte un mayor porcentaje de sus ocasiones.',
    '{equipo} tiene mejor pegada; puede castigar cualquier desajuste rival.',
  ],
  J_GLOBAL: [
    'El balance favorece ligeramente a {equipo}.',
    'El partido puede definirse por detalles.',
    '{equipo} llega con ventaja competitiva.',
  ],
};

export function textoAtaque(equipo) {
  return pick(PLANTILLAS.A_ATAQUE, { equipo });
}
export function textoDefensa(equipo) {
  return pick(PLANTILLAS.B_DEFENSA, { equipo });
}
export function textoBalance(equipo) {
  return pick(PLANTILLAS.C_BALANCE, { equipo });
}
export function textoMomentoBueno(equipo) {
  return pick(PLANTILLAS.D_MOMENTO_BUENO, { equipo });
}
export function textoMomentoMalo(equipo) {
  return pick(PLANTILLAS.D_MOMENTO_MALO, { equipo });
}
export function textoUrgencia(equipo) {
  return pick(PLANTILLAS.E_URGENCIA, { equipo });
}
export function textoTabla(equipo) {
  return pick(PLANTILLAS.F_TABLA, { equipo });
}
export function textoLigaDistinta() {
  return pick(PLANTILLAS.G_LIGA);
}
export function textoTipoOfensivo() {
  return pick([PLANTILLAS.H_TIPO[0]]);
}
export function textoTipoCerrado() {
  return pick([PLANTILLAS.H_TIPO[1]]);
}
export function textoTipoEquilibrado() {
  return pick([PLANTILLAS.H_TIPO[2]]);
}
export function textoEficacia(equipo) {
  return pick(PLANTILLAS.I_EFICACIA, { equipo });
}
export function textoGlobal(equipo) {
  return pick(PLANTILLAS.J_GLOBAL, { equipo });
}
export function textoGlobalDetalles() {
  return pick(['El partido puede definirse por detalles.']);
}

// ─── Selección (máx. 4, por prioridad) ──────────────────────────────────────

/**
 * @param {Array<{ categoria: string, texto?: string, [key: string]: any }>} candidatos
 * @param {number} max
 */
export function seleccionarConclusiones(candidatos, max = MAX_CONCLUSIONES) {
  if (!candidatos?.length) return [];

  const ordenados = [...candidatos].sort(
    (a, b) =>
      (CATEGORIA_PRIORIDAD[a.categoria] ?? 50) - (CATEGORIA_PRIORIDAD[b.categoria] ?? 50)
  );

  const elegidas = [];
  const categoriasUsadas = new Set();

  for (const item of ordenados) {
    if (elegidas.length >= max) break;
    const cat = item.categoria;
    if (cat !== 'motivacion' && cat !== 'tabla' && categoriasUsadas.has(cat)) continue;
    categoriasUsadas.add(cat);
    elegidas.push(item);
  }

  return elegidas;
}

/** Convierte ítems con .texto a strings (Predicciones / Comparador) */
export function aTextosPlano(items) {
  return items.map((i) => (typeof i === 'string' ? i : i.texto)).filter(Boolean);
}

// ─── Predicciones: comparativa dos equipos (umbrales sin cambio) ───────────────

export function buildConclusionesComparativaEquipos(predicciones, equipoA, equipoB) {
  if (!predicciones || !equipoA || !equipoB) {
    return [CONCLUSIONES_MENSAJE_BASE];
  }

  const candidatos = [];
  const nombreA = equipoA.nombre || 'Equipo A';
  const nombreB = equipoB.nombre || 'Equipo B';

  const diferenciaForma = predicciones.puntosFormaA - predicciones.puntosFormaB;
  if (Math.abs(diferenciaForma) >= 2) {
    const equipo = diferenciaForma > 0 ? nombreA : nombreB;
    candidatos.push({ categoria: 'momento', texto: textoMomentoBueno(equipo) });
  }

  const xGA = equipoA.estadisticasDefensivas?.xGA || 0;
  const xGAB = equipoB.estadisticasDefensivas?.xGA || 0;
  let favorDefensa = null;
  if (xGA > 0 && xGAB > 0) {
    if (xGA < xGAB - 0.2) favorDefensa = nombreA;
    else if (xGAB < xGA - 0.2) favorDefensa = nombreB;
    if (favorDefensa) {
      candidatos.push({ categoria: 'defensa', texto: textoDefensa(favorDefensa) });
    }
  }

  const xG = equipoA.estadisticasOfensivas?.xG || 0;
  const xGB = equipoB.estadisticasOfensivas?.xG || 0;
  let favorAtaque = null;
  if (xG > 0 && xGB > 0) {
    if (xG > xGB + 0.2) favorAtaque = nombreA;
    else if (xGB > xG + 0.2) favorAtaque = nombreB;
    if (favorAtaque) {
      candidatos.push({ categoria: 'ataque', texto: textoAtaque(favorAtaque) });
    }
  }

  if (favorAtaque && favorDefensa && favorAtaque === favorDefensa) {
    candidatos.push({ categoria: 'balance', texto: textoBalance(favorAtaque) });
  }

  const golesA = equipoA.promedioGolesFavor || 0;
  const golesB = equipoB.promedioGolesFavor || 0;
  if (golesA > golesB + 0.3) {
    candidatos.push({ categoria: 'eficacia', texto: textoEficacia(nombreA) });
  } else if (golesB > golesA + 0.3) {
    candidatos.push({ categoria: 'eficacia', texto: textoEficacia(nombreB) });
  }

  const ligaA = equipoA.leagueId ?? equipoA.ligaId ?? equipoA.liga;
  const ligaB = equipoB.leagueId ?? equipoB.ligaId ?? equipoB.liga;
  if (ligaA && ligaB && String(ligaA) !== String(ligaB)) {
    candidatos.push({ categoria: 'liga', texto: textoLigaDistinta() });
  }

  const elegidas = seleccionarConclusiones(candidatos);
  if (elegidas.length === 0) {
    return [CONCLUSIONES_MENSAJE_BASE];
  }

  return aTextosPlano(elegidas);
}

/** Selección para conclusiones CID (objetos con tipo, icono, texto) */
export function seleccionarConclusionesCID(conclusiones, max = MAX_CONCLUSIONES) {
  const elegidas = seleccionarConclusiones(conclusiones, max);
  return elegidas.length > 0 ? elegidas : [CONCLUSIONES_CID_MENSAJE_BASE];
}
