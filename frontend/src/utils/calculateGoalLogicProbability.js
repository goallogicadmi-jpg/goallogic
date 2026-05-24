/**
 * Calcula la probabilidad GoalLogic para un equipo según las fórmulas exactas proporcionadas
 * @param {Object} equipo - Datos del equipo
 * @param {Object} equipoOponente - Datos del equipo oponente
 * @param {Object} datosAdicionales - Datos adicionales (lesiones, fixtures, etc.)
 * @param {String} tipo - 'local' o 'visitante'
 * @returns {Number} Probabilidad del equipo (0-1)
 */
export function calculateGoalLogicProbability(equipo, equipoOponente, datosAdicionales, tipo) {
  // ============================================
  // 1. OBTENER DATOS NECESARIOS
  // ============================================

  // Rendimiento Reciente (últimos 5 partidos)
  const ultimosPartidos = equipo.ultimosPartidos || [];
  const ultimos5 = ultimosPartidos.slice(0, 5);
  
  let promedioGolesAnotados = 0;
  let promedioGolesRecibidos = 0;
  let sumaForma = 0;

  if (ultimos5.length > 0) {
    const totalGolesAnotados = ultimos5.reduce((sum, p) => sum + (p.golesFavor || 0), 0);
    const totalGolesRecibidos = ultimos5.reduce((sum, p) => sum + (p.golesContra || 0), 0);
    
    promedioGolesAnotados = totalGolesAnotados / ultimos5.length;
    promedioGolesRecibidos = totalGolesRecibidos / ultimos5.length;
    
    // Forma: W = 1, D = 0.5, L = 0
    sumaForma = ultimos5.reduce((sum, p) => {
      if (p.resultado === 'G') return sum + 1;
      if (p.resultado === 'E') return sum + 0.5;
      return sum + 0;
    }, 0);
  }

  // Local / Visitante
  // Intentar obtener desde datosAdicionales primero, luego desde equipo
  const estadisticasLocalVisitante = datosAdicionales?.estadisticas?.estadisticasLocalVisitante || {};
  
  // Determinar qué equipo es (A o B) comparando IDs
  // Intentar obtener el ID del equipo desde diferentes fuentes
  const equipoAId = datosAdicionales?.estadisticas?.estadisticasLocalVisitante?.equipoA?.estadisticas?.team?.id;
  const equipoBId = datosAdicionales?.estadisticas?.estadisticasLocalVisitante?.equipoB?.estadisticas?.team?.id;
  
  // Comparar IDs para determinar si es equipoA o equipoB
  let esEquipoA = false;
  if (equipoAId && equipo.id === equipoAId) {
    esEquipoA = true;
  } else if (equipoBId && equipo.id === equipoBId) {
    esEquipoA = false;
  } else {
    // Fallback: si tipo es 'local', asumir que es equipoA; si es 'visitante', equipoB
    esEquipoA = tipo === 'local';
  }
  
  const estadisticasEquipo = esEquipoA
    ? (estadisticasLocalVisitante.equipoA?.estadisticas || {})
    : (estadisticasLocalVisitante.equipoB?.estadisticas || {});
  
  const estadisticasLocal = estadisticasEquipo.fixtures?.home || {};
  const estadisticasVisitante = estadisticasEquipo.fixtures?.away || {};
  
  let golesLocalOVist = 0;
  let golesRecibLocalOVist = 0;
  let porcentajeVictorias = 0;

  if (tipo === 'local') {
    // Calcular promedio de goles como local
    const golesFavorLocal = estadisticasLocal.goals?.for?.total || estadisticasLocal.goals?.for || 0;
    const partidosLocal = estadisticasLocal.played?.total || estadisticasLocal.played || 1;
    golesLocalOVist = partidosLocal > 0 ? golesFavorLocal / partidosLocal : equipo.promedioGolesFavor || 0;
    
    // Calcular promedio de goles recibidos como local
    const golesContraLocal = estadisticasLocal.goals?.against?.total || estadisticasLocal.goals?.against || 0;
    golesRecibLocalOVist = partidosLocal > 0 ? golesContraLocal / partidosLocal : equipo.promedioGolesContra || 0;
    
    // Calcular porcentaje de victorias como local
    const victoriasLocal = estadisticasLocal.wins?.total || estadisticasLocal.wins || 0;
    porcentajeVictorias = partidosLocal > 0 ? (victoriasLocal / partidosLocal) * 100 : 0;
  } else {
    // Calcular promedio de goles como visitante
    const golesFavorVisitante = estadisticasVisitante.goals?.for?.total || estadisticasVisitante.goals?.for || 0;
    const partidosVisitante = estadisticasVisitante.played?.total || estadisticasVisitante.played || 1;
    golesLocalOVist = partidosVisitante > 0 ? golesFavorVisitante / partidosVisitante : equipo.promedioGolesFavor || 0;
    
    // Calcular promedio de goles recibidos como visitante
    const golesContraVisitante = estadisticasVisitante.goals?.against?.total || estadisticasVisitante.goals?.against || 0;
    golesRecibLocalOVist = partidosVisitante > 0 ? golesContraVisitante / partidosVisitante : equipo.promedioGolesContra || 0;
    
    // Calcular porcentaje de victorias como visitante
    const victoriasVisitante = estadisticasVisitante.wins?.total || estadisticasVisitante.wins || 0;
    porcentajeVictorias = partidosVisitante > 0 ? (victoriasVisitante / partidosVisitante) * 100 : 0;
  }

  // Estadísticas Avanzadas
  // Intentar obtener desde estadisticasEquipo primero
  const posesion = estadisticasEquipo.possession || equipo.estadisticasOfensivas?.posesion || equipo.estadisticas?.posesion || 50;
  
  // Tiros a puerta promedio
  const tirosAlArcoTotal = estadisticasEquipo.shots?.on?.total || estadisticasEquipo.shots?.on || 0;
  const partidosTotales = estadisticasEquipo.fixtures?.played?.total || estadisticasEquipo.fixtures?.played || equipo.ultimosPartidos?.length || 1;
  const tirosPuerta = partidosTotales > 0 ? tirosAlArcoTotal / partidosTotales : (equipo.estadisticasOfensivas?.tirosAlArcoPromedio || equipo.estadisticasOfensivas?.tirosAlArco || 0);
  
  // xG
  const xGTotal = estadisticasEquipo.goals?.expected?.for?.total || estadisticasEquipo.goals?.expected?.for || null;
  const xG = xGTotal !== null && partidosTotales > 0 ? xGTotal / partidosTotales : (equipo.estadisticasOfensivas?.xG || null);

  // Contexto
  // Determinar qué equipo es para obtener lesiones correctas
  // equipoAId y esEquipoA ya están declarados arriba (líneas 43 y 47)
  
  const lesionesBloque = esEquipoA
    ? datosAdicionales?.lesiones?.equipoA
    : datosAdicionales?.lesiones?.equipoB;

  const lesionesEquipo = lesionesBloque?.jugadores || [];
  const numeroLesionesClave = lesionesEquipo.length;
  const factorLesionesEvaluado = lesionesBloque?.resumenImpacto?.factor;
  
  // Días de descanso (simplificado: usar 3 días como default, se puede mejorar con fixtures)
  const diasDescanso = 3; // TODO: Calcular desde fixtures reales
  
  // Importancia del partido (default: 3, escala 1-5)
  const importancia = 3; // TODO: Calcular según contexto de liga/competición

  // ============================================
  // 2. APLICAR FÓRMULAS EXACTAS
  // ============================================

  // Función para limitar valores al rango 0-1
  const limitar = (valor) => Math.min(Math.max(valor, 0), 1);

  // ---------------------------------
  // MÓDULO 1 — Rendimiento Reciente (R)
  // ---------------------------------
  const R_GF = limitar(promedioGolesAnotados / 4);
  const R_GA = limitar(1 - (promedioGolesRecibidos / 4));
  const R_FORM = limitar(sumaForma / 5);
  const R = (R_GF + R_GA + R_FORM) / 3;

  // ---------------------------------
  // MÓDULO 2 — Local / Visitante (L)
  // ---------------------------------
  const L_GF = limitar(golesLocalOVist / 4);
  const L_GA = limitar(1 - (golesRecibLocalOVist / 4));
  const L_WIN = limitar(porcentajeVictorias / 100);
  const L = (L_GF + L_GA + L_WIN) / 3;

  // ---------------------------------
  // MÓDULO 3 — Estadísticas Avanzadas (A)
  // ---------------------------------
  const A_POS = limitar(posesion / 100);
  const A_SHOTS = limitar(tirosPuerta / 10);
  
  let A;
  if (xG !== null && xG !== undefined) {
    const A_XG = limitar(xG / 3);
    A = (A_POS + A_SHOTS + A_XG) / 3;
  } else {
    A = (A_POS + A_SHOTS) / 2;
  }

  // ---------------------------------
  // MÓDULO 4 — Contexto (C)
  // ---------------------------------
  let C_LES;
  if (typeof factorLesionesEvaluado === 'number' && Number.isFinite(factorLesionesEvaluado)) {
    C_LES = factorLesionesEvaluado;
  } else if (numeroLesionesClave === 0) {
    C_LES = 1;
  } else if (numeroLesionesClave === 1) {
    C_LES = 0.8;
  } else if (numeroLesionesClave === 2) {
    C_LES = 0.6;
  } else {
    C_LES = 0.4;
  }

  const C_REST = limitar(diasDescanso / 7);
  const C_IMP = limitar(importancia / 5);
  const C = (C_LES + C_REST + C_IMP) / 3;

  // ============================================
  // 3. COMBINACIÓN FINAL
  // ============================================
  const P_equipo = (R * 0.40) + (L * 0.25) + (A * 0.25) + (C * 0.10);

  return limitar(P_equipo);
}

/**
 * Calcula las probabilidades finales GoalLogic para ambos equipos con normalización
 * @param {Object} equipoLocal - Datos del equipo local
 * @param {Object} equipoVisitante - Datos del equipo visitante
 * @param {Object} datosAdicionales - Datos adicionales
 * @returns {Object} { local, visitante, empate }
 */
export function calculateFinalGoalLogicProbabilities(equipoLocal, equipoVisitante, datosAdicionales) {
  // Calcular probabilidades base
  const P_local = calculateGoalLogicProbability(equipoLocal, equipoVisitante, datosAdicionales, 'local');
  const P_visitante = calculateGoalLogicProbability(equipoVisitante, equipoLocal, datosAdicionales, 'visitante');

  // Calcular diferencia absoluta
  const DIF = Math.abs(P_local - P_visitante);

  // Probabilidad de empate base
  let P_empate = 0.25 - (DIF * 0.20);

  // Limitar P_empate al rango 0.15-0.30
  P_empate = Math.max(0.15, Math.min(P_empate, 0.30));

  // Normalización final
  const S = P_local + P_visitante;
  
  let probLocal = (P_local / S) * (1 - P_empate);
  let probVisitante = (P_visitante / S) * (1 - P_empate);

  // Asegurar que sumen 1.0
  const total = probLocal + probVisitante + P_empate;
  if (total > 0) {
    probLocal = probLocal / total;
    probVisitante = probVisitante / total;
    P_empate = P_empate / total;
  }

  return {
    local: probLocal,
    visitante: probVisitante,
    empate: P_empate
  };
}
