import clubCupTournamentRules from '../config/clubCupTournamentRules.json';
import selectionTournamentRules from '../config/selectionTournamentRules.json';
import { resolveCompetitionDomain } from './cupCompetitionDomain';

function getRulesMap(domain) {
  return domain === 'selection' ? selectionTournamentRules : clubCupTournamentRules;
}

export function getCupTournamentRule(competitionId, domainHint) {
  const domain = resolveCompetitionDomain(competitionId, domainHint);
  const rules = getRulesMap(domain);
  const normalizedId = String(Number(competitionId));
  return rules[normalizedId] || rules.default || {};
}

export function getVisibleGroupTypes(competitionId, domainHint) {
  const rule = getCupTournamentRule(competitionId, domainHint);
  const defaults =
    resolveCompetitionDomain(competitionId, domainHint) === 'selection'
      ? ['group', 'league_group']
      : ['group'];
  return rule.visibleGroupTypes || defaults;
}
