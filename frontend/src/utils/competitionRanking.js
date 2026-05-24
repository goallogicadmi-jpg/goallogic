import { getCompetitionByIdFromCatalog } from '../config/competitionCatalog';

/** Torneos de selecciones europeas: ranking FIFA filtrado a UEFA. */
const UEFA_SELECTION_LEAGUE_IDS = new Set([4, 5]);

/**
 * El ranking FIFA (mock) solo aplica a torneos de selecciones nacionales.
 * Competiciones de clubes (Champions, Europa League, Libertadores, etc.) no deben mostrarlo.
 */
export function isFifaSelectionRankingCompetition(leagueId, domain, competitionInfo = null) {
  if (domain !== 'selection') {
    return false;
  }

  const catalog =
    getCompetitionByIdFromCatalog(leagueId) ||
    (competitionInfo?.participantType
      ? { participantType: competitionInfo.participantType, type: competitionInfo.type }
      : null);

  if (!catalog) {
    return false;
  }

  if (catalog.participantType === 'club') {
    return false;
  }

  if (catalog.type === 'League' && catalog.format === 'league') {
    return false;
  }

  return true;
}

export function filterFifaRankingForCompetition(entries, leagueId) {
  const id = Number(leagueId);
  if (!UEFA_SELECTION_LEAGUE_IDS.has(id)) {
    return entries;
  }
  return entries.filter((entry) => String(entry.confederation || '').toUpperCase() === 'UEFA');
}
