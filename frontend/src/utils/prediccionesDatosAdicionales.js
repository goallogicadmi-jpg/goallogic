import {
  getH2H,
  getTeamStats,
  getTeamPlayersStats,
  getTeamFixtures,
  getUpcomingFixtureWithOdds,
} from '../api/api';
import {
  procesarCornersDeFixtures,
  expectedCorners,
  procesarTarjetasDeFixtures,
  expectedCards,
} from './calcularCorners';
import { buildH2HDisplayData } from './h2hFixturesUtils';

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
}) {
  return {
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
  let fixtureConOdds = null;
  try {
    fixtureConOdds = await getUpcomingFixtureWithOdds(equipoA.id, equipoB.id, {
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

  const [h2hData, statsA, statsB, playersStatsA, playersStatsB, fixturesA, fixturesB] =
    await Promise.all([
      getH2H(equipoA.id, equipoB.id).catch((err) => {
        console.warn('⚠️ Error obteniendo H2H:', err);
        return { response: [] };
      }),
      getTeamStats(equipoA.id, ligaA, seasonA).catch((err) => {
        console.warn('⚠️ Error obteniendo estadísticas equipo A:', err);
        return { response: [] };
      }),
      getTeamStats(equipoB.id, ligaB, seasonB).catch((err) => {
        console.warn('⚠️ Error obteniendo estadísticas equipo B:', err);
        return { response: [] };
      }),
      getTeamPlayersStats(equipoA.id, ligaA, seasonA).catch((err) => {
        console.warn('⚠️ Error obteniendo estadísticas de jugadores equipo A:', err);
        return { response: [] };
      }),
      getTeamPlayersStats(equipoB.id, ligaB, seasonB).catch((err) => {
        console.warn('⚠️ Error obteniendo estadísticas de jugadores equipo B:', err);
        return { response: [] };
      }),
      getTeamFixtures(equipoA.id, 10).catch((err) => {
        console.warn('⚠️ Error obteniendo fixtures equipo A:', err);
        return { response: [] };
      }),
      getTeamFixtures(equipoB.id, 10).catch((err) => {
        console.warn('⚠️ Error obteniendo fixtures equipo B:', err);
        return { response: [] };
      }),
    ]);

  const [cornersDataA, cornersDataB] = await Promise.all([
    procesarCornersDeFixtures(fixturesA?.response || [], equipoA.id, 5),
    procesarCornersDeFixtures(fixturesB?.response || [], equipoB.id, 5),
  ]);

  const cornersEsperados = expectedCorners(
    { cornersFor: cornersDataA.cornersFor, cornersAgainst: cornersDataA.cornersAgainst },
    { cornersFor: cornersDataB.cornersFor, cornersAgainst: cornersDataB.cornersAgainst }
  );

  const [tarjetasDataA, tarjetasDataB] = await Promise.all([
    procesarTarjetasDeFixtures(fixturesA?.response || [], equipoA.id, 5),
    procesarTarjetasDeFixtures(fixturesB?.response || [], equipoB.id, 5),
  ]);

  const tarjetasEsperadas = expectedCards(
    { cardsFor: tarjetasDataA.cardsFor, cardsAgainst: tarjetasDataA.cardsAgainst },
    { cardsFor: tarjetasDataB.cardsFor, cardsAgainst: tarjetasDataB.cardsAgainst }
  );

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
    equipoA,
    equipoB,
    ligaA,
    ligaB,
    seasonA,
    seasonB,
  });
}
