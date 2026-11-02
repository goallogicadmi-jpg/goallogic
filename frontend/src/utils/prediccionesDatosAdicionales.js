import {
  getH2H,
  getTeamStats,
  getTeamPlayersStats,
  getTeamInjuries,
  getUpcomingFixtureWithOdds,
} from '../api/api';
import { enrichTeamInjuries } from './evaluateInjuryImpact';
import { getTeamFixturesForPredicciones } from './prediccionesTeamFixtures';
import {
  buildPairMetricsKey,
  recordMetricsTrace,
} from './prediccionesMetricsCache';
import {
  procesarCornersYTarjetasDeFixtures,
  expectedCorners,
  expectedCards,
} from './calcularCorners';
import { buildH2HDisplayData } from './h2hFixturesUtils';

function normalizeTeamId(teamId) {
  const parsed = Number(teamId);
  return Number.isFinite(parsed) ? parsed : teamId;
}

function normalizeEquipoRef(equipo) {
  return {
    id: normalizeTeamId(equipo?.id),
    nombre: equipo?.nombre ?? equipo?.name ?? 'Equipo',
  };
}

function mapGoleadoresFromPlayersStats(playersStats) {
  return (playersStats?.response || [])
    .filter((j) => j.statistics && j.statistics.length > 0)
    .map((jugador) => ({
      nombre: jugador.player?.name,
      posicion: jugador.statistics[0]?.games?.position,
      goles: jugador.statistics[0]?.goals?.total || 0,
      asistencias: jugador.statistics[0]?.goals?.assists || 0,
      partidos: jugador.statistics[0]?.games?.appearences || 0,
      minutos: jugador.statistics[0]?.games?.minutes || 0,
    }))
    .sort((a, b) => b.goles - a.goles)
    .slice(0, 10);
}

export function buildAccordionLazyContext({
  equipoA,
  equipoB,
  ligaA,
  ligaB,
  seasonA,
  seasonB,
  fixtureId,
  playersStatsA,
  playersStatsB,
  fixturesA,
  fixturesB,
}) {
  return {
    equipoAId: equipoA.id,
    equipoBId: equipoB.id,
    ligaA,
    ligaB,
    seasonA,
    seasonB,
    fixtureId: fixtureId ?? null,
    nombreEquipoA: equipoA.nombre,
    nombreEquipoB: equipoB.nombre,
    prefetch: {
      ready: Boolean(playersStatsA && playersStatsB && fixturesA && fixturesB),
      playersStatsA: playersStatsA ?? null,
      playersStatsB: playersStatsB ?? null,
      fixturesA: fixturesA?.response ?? fixturesA ?? [],
      fixturesB: fixturesB?.response ?? fixturesB ?? [],
    },
  };
}

export function buildLesionesEquipoPair({
  injuriesA,
  injuriesB,
  playersStatsA,
  playersStatsB,
}) {
  return {
    equipoA: {
      ...enrichTeamInjuries(injuriesA, playersStatsA),
      fetchMeta: injuriesA?.meta || null,
    },
    equipoB: {
      ...enrichTeamInjuries(injuriesB, playersStatsB),
      fetchMeta: injuriesB?.meta || null,
    },
  };
}

export function buildSkeletonAccordionLazyContext({
  equipoA,
  equipoB,
  ligaA,
  ligaB,
  seasonA,
  seasonB,
  fixtureId,
}) {
  return buildAccordionLazyContext({
    equipoA,
    equipoB,
    ligaA,
    ligaB,
    seasonA,
    seasonB,
    fixtureId,
    playersStatsA: null,
    playersStatsB: null,
    fixturesA: null,
    fixturesB: null,
  });
}

export function buildDatosAdicionalesEstructurados({
  h2hData,
  fixtureConOdds,
  upcomingFixtureId,
  statsA,
  statsB,
  playersStatsA,
  playersStatsB,
  fixturesA,
  fixturesB,
  cornersDataA,
  cornersDataB,
  tarjetasDataA,
  tarjetasDataB,
  cornersEsperados,
  tarjetasEsperadas,
  equipoA,
  equipoB,
  ligaA,
  ligaB,
  seasonA,
  seasonB,
  lesiones,
}) {
  return {
    lesiones: lesiones || buildLesionesEquipoPair({
      injuriesA: { response: [] },
      injuriesB: { response: [] },
      playersStatsA,
      playersStatsB,
    }),
    h2h: buildH2HDisplayData(h2hData?.response || []),
    accordionLazy: buildAccordionLazyContext({
      equipoA,
      equipoB,
      ligaA,
      ligaB,
      seasonA,
      seasonB,
      fixtureId: upcomingFixtureId,
      playersStatsA,
      playersStatsB,
      fixturesA,
      fixturesB,
    }),
    estadisticasLocalVisitante: {
      equipoA: {
        estadisticas: statsA?.response || null,
        local: statsA?.response?.fixtures?.home || null,
        visitante: statsA?.response?.fixtures?.away || null,
      },
      equipoB: {
        estadisticas: statsB?.response || null,
        local: statsB?.response?.fixtures?.home || null,
        visitante: statsB?.response?.fixtures?.away || null,
      },
    },
    goleadores: {
      equipoA: {
        total: playersStatsA?.response?.length || 0,
        jugadores: mapGoleadoresFromPlayersStats(playersStatsA),
      },
      equipoB: {
        total: playersStatsB?.response?.length || 0,
        jugadores: mapGoleadoresFromPlayersStats(playersStatsB),
      },
    },
    cornersYFaltas: {
      equipoA: {
        fixtures: fixturesA?.response || [],
        cornersFor: cornersDataA.cornersFor,
        cornersAgainst: cornersDataA.cornersAgainst,
        promedioCorners: cornersDataA.promedioFor,
        promedioCornersContra: cornersDataA.promedioAgainst,
        cardsFor: tarjetasDataA.cardsFor,
        cardsAgainst: tarjetasDataA.cardsAgainst,
        promedioTarjetas: tarjetasDataA.promedioFor,
        promedioTarjetasContra: tarjetasDataA.promedioAgainst,
      },
      equipoB: {
        fixtures: fixturesB?.response || [],
        cornersFor: cornersDataB.cornersFor,
        cornersAgainst: cornersDataB.cornersAgainst,
        promedioCorners: cornersDataB.promedioFor,
        promedioCornersContra: cornersDataB.promedioAgainst,
        cardsFor: tarjetasDataB.cardsFor,
        cardsAgainst: tarjetasDataB.cardsAgainst,
        promedioTarjetas: tarjetasDataB.promedioFor,
        promedioTarjetasContra: tarjetasDataB.promedioAgainst,
      },
      cornersEsperados,
      tarjetasEsperadas,
    },
    arbitro: {
      disponible: false,
      nombre: null,
      promedioTarjetas: null,
      tendencias: null,
    },
    alineaciones: {
      disponible: false,
      equipoA: null,
      equipoB: null,
    },
    fixtureConOdds,
  };
}

/**
 * Fase 2 — datos complementarios (no bloquean el resumen inicial).
 */
export async function fetchPrediccionesDatosAdicionales({
  equipoA,
  equipoB,
  ligaA,
  ligaB,
  seasonA,
  seasonB,
  routeFixtureId,
}) {
  const equipoNormA = normalizeEquipoRef(equipoA);
  const equipoNormB = normalizeEquipoRef(equipoB);

  try {
  let fixtureConOdds = null;
  try {
    fixtureConOdds = await getUpcomingFixtureWithOdds(equipoNormA.id, equipoNormB.id, {
      leagueId: ligaA,
      season: seasonA,
      fixtureId: routeFixtureId ?? null,
    });
  } catch (err) {
    console.warn('⚠️ Error obteniendo fixture próximo y odds:', err);
    fixtureConOdds = { fixture: null, odds: null };
  }

  const upcomingFixtureId =
    fixtureConOdds?.fixture?.fixture?.id ?? fixtureConOdds?.fixture?.id ?? routeFixtureId ?? null;

  const [
    h2hData,
    statsA,
    statsB,
    playersStatsA,
    playersStatsB,
    fixturesA,
    fixturesB,
    injuriesA,
    injuriesB,
  ] = await Promise.all([
      getH2H(equipoNormA.id, equipoNormB.id).catch((err) => {
        console.warn('⚠️ Error obteniendo H2H:', err);
        return { response: [] };
      }),
      getTeamStats(equipoNormA.id, ligaA, seasonA).catch((err) => {
        console.warn('⚠️ Error obteniendo estadísticas equipo A:', err);
        return { response: [] };
      }),
      getTeamStats(equipoNormB.id, ligaB, seasonB).catch((err) => {
        console.warn('⚠️ Error obteniendo estadísticas equipo B:', err);
        return { response: [] };
      }),
      getTeamPlayersStats(equipoNormA.id, ligaA, seasonA).catch((err) => {
        console.warn('⚠️ Error obteniendo estadísticas de jugadores equipo A:', err);
        return { response: [] };
      }),
      getTeamPlayersStats(equipoNormB.id, ligaB, seasonB).catch((err) => {
        console.warn('⚠️ Error obteniendo estadísticas de jugadores equipo B:', err);
        return { response: [] };
      }),
      getTeamFixturesForPredicciones(equipoNormA.id, 25).catch((err) => {
        console.warn('⚠️ Error obteniendo fixtures equipo A:', err);
        return { response: [] };
      }),
      getTeamFixturesForPredicciones(equipoNormB.id, 25).catch((err) => {
        console.warn('⚠️ Error obteniendo fixtures equipo B:', err);
        return { response: [] };
      }),
      getTeamInjuries(equipoNormA.id, {
        leagueId: ligaA,
        season: seasonA,
        fixtureId: upcomingFixtureId ?? routeFixtureId ?? null,
      }).catch((err) => {
        console.warn('⚠️ Error obteniendo lesiones equipo A:', err);
        return { response: [], meta: { error: err.message } };
      }),
      getTeamInjuries(equipoNormB.id, {
        leagueId: ligaB,
        season: seasonB,
        fixtureId: upcomingFixtureId ?? routeFixtureId ?? null,
      }).catch((err) => {
        console.warn('⚠️ Error obteniendo lesiones equipo B:', err);
        return { response: [], meta: { error: err.message } };
      }),
    ]);

  const lesiones = buildLesionesEquipoPair({
    injuriesA,
    injuriesB,
    playersStatsA,
    playersStatsB,
  });

  const fixturesListA = fixturesA?.response || [];
  const fixturesListB = fixturesB?.response || [];

  const [metricasEquipoA, metricasEquipoB] = await Promise.all([
    procesarCornersYTarjetasDeFixtures(fixturesListA, equipoNormA.id, 5),
    procesarCornersYTarjetasDeFixtures(fixturesListB, equipoNormB.id, 5),
  ]);

  const cornersDataA = metricasEquipoA.corners;
  const cornersDataB = metricasEquipoB.corners;
  const tarjetasDataA = metricasEquipoA.tarjetas;
  const tarjetasDataB = metricasEquipoB.tarjetas;

  const cornersEsperados = expectedCorners(
    { cornersFor: cornersDataA.cornersFor, cornersAgainst: cornersDataA.cornersAgainst },
    { cornersFor: cornersDataB.cornersFor, cornersAgainst: cornersDataB.cornersAgainst }
  );

  const tarjetasEsperadas = expectedCards(
    { cardsFor: tarjetasDataA.cardsFor, cardsAgainst: tarjetasDataA.cardsAgainst },
    { cardsFor: tarjetasDataB.cardsFor, cardsAgainst: tarjetasDataB.cardsAgainst }
  );

  recordMetricsTrace(buildPairMetricsKey(equipoNormA.id, equipoNormB.id), {
    teamA: metricasEquipoA.trace,
    teamB: metricasEquipoB.trace,
    cornersEsperados,
    tarjetasEsperadas,
  });

  return buildDatosAdicionalesEstructurados({
    h2hData,
    fixtureConOdds,
    upcomingFixtureId,
    statsA,
    statsB,
    playersStatsA,
    playersStatsB,
    fixturesA,
    fixturesB,
    cornersDataA,
    cornersDataB,
    tarjetasDataA,
    tarjetasDataB,
    cornersEsperados,
    tarjetasEsperadas,
    equipoA: equipoNormA,
    equipoB: equipoNormB,
    ligaA,
    ligaB,
    seasonA,
    seasonB,
    lesiones,
  });
  } catch (err) {
    console.error('❌ Error crítico en fetchPrediccionesDatosAdicionales:', err);
    return buildDatosAdicionalesEstructurados({
      h2hData: { response: [] },
      fixtureConOdds: { fixture: null, odds: null },
      upcomingFixtureId: routeFixtureId ?? null,
      statsA: { response: [] },
      statsB: { response: [] },
      playersStatsA: { response: [] },
      playersStatsB: { response: [] },
      fixturesA: { response: [] },
      fixturesB: { response: [] },
      cornersDataA: { cornersFor: [], cornersAgainst: [], promedioFor: 0, promedioAgainst: 0 },
      cornersDataB: { cornersFor: [], cornersAgainst: [], promedioFor: 0, promedioAgainst: 0 },
      tarjetasDataA: { cardsFor: [], cardsAgainst: [], promedioFor: 0, promedioAgainst: 0 },
      tarjetasDataB: { cardsFor: [], cardsAgainst: [], promedioFor: 0, promedioAgainst: 0 },
      cornersEsperados: { expectedA: 0, expectedB: 0, total: 0 },
      tarjetasEsperadas: { expectedA: 0, expectedB: 0, total: 0 },
      equipoA: equipoNormA,
      equipoB: equipoNormB,
      ligaA,
      ligaB,
      seasonA,
      seasonB,
      lesiones: buildLesionesEquipoPair({
        injuriesA: { response: [] },
        injuriesB: { response: [] },
        playersStatsA: { response: [] },
        playersStatsB: { response: [] },
      }),
    });
  }
}
