import selectionTournamentRules from './selectionTournamentRules.json';

export function getSelectionTournamentRule(competitionId) {
  const normalizedId = String(Number(competitionId));
  return selectionTournamentRules[normalizedId] || selectionTournamentRules.default;
}

export function getVisibleGroupTypes(competitionId) {
  return getSelectionTournamentRule(competitionId)?.visibleGroupTypes || ['group', 'league_group'];
}
