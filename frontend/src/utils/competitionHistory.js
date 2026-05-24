import historyData from '../data/competitionHistory.json';

import { getCompetitionByIdFromCatalog } from '../config/competitionCatalog';

import { resolveCompetitionDomain } from './cupCompetitionDomain';



const EDITIONS_LIMIT = 5;



/**

 * Historial mock filtrado por dominio (sin mezclar selecciones ↔ clubes).

 */

export function getCompetitionHistoryEditions(leagueId, domainHint) {

  const key = leagueId != null ? String(leagueId) : '';

  const domain = resolveCompetitionDomain(leagueId, domainHint);

  const byLeague = historyData.byLeagueId?.[key];



  if (Array.isArray(byLeague) && byLeague.length > 0) {
    return [...byLeague]
      .sort((a, b) => Number(b.year) - Number(a.year))
      .slice(0, EDITIONS_LIMIT);
  }

  // Sin fallback global: cada competición debe tener su propio historial en byLeagueId.
  return [];
}

/**
 * Indica si la competición tiene al menos una edición de historial válida.
 */
export function hasCompetitionHistory(leagueId, domainHint) {
  return getCompetitionHistoryEditions(leagueId, domainHint).length > 0;
}

export function getHistoryMeta() {

  return {

    source: historyData.source || 'Historial (mock)',

    updatedAt: historyData.updatedAt || null,

  };

}



/** Campeón de una edición concreta (año), si existe en el historial de esa liga. */
export function getChampionBySeason(leagueId, seasonYear, domainHint) {
  const year = Number(seasonYear);
  if (!Number.isFinite(year)) return null;

  const catalog = getCompetitionByIdFromCatalog(leagueId);
  const domain = resolveCompetitionDomain(leagueId, domainHint || catalog?.domain);
  const edition = getCompetitionHistoryEditions(leagueId, domain).find(
    (item) => Number(item.year) === year
  );

  if (!edition?.championName) return null;

  return {
    year: edition.year,
    championId: edition.championId,
    championName: edition.championName,
    championFlag: edition.championFlag,
    finalScore: edition.finalScore,
  };
}

/** Campeón de la edición más reciente en el historial mock (solo datos de esa liga). */
export function getLatestChampion(leagueId, domainHint) {
  const catalog = getCompetitionByIdFromCatalog(leagueId);
  const domain = resolveCompetitionDomain(leagueId, domainHint || catalog?.domain);
  const editions = getCompetitionHistoryEditions(leagueId, domain);

  const latest = editions[0];

  if (!latest?.championName) return null;

  return {

    year: latest.year,

    championId: latest.championId,

    championName: latest.championName,

    championFlag: latest.championFlag,

    finalScore: latest.finalScore,

  };

}


