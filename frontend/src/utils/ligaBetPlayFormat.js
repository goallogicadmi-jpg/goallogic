export const LIGA_BETPLAY_LEAGUE_ID = 239;

export const FIRST_DIRECT_KNOCKOUT_SEASON = 2026;

export function isLigaBetPlay(leagueId) {
  return Number(leagueId) === LIGA_BETPLAY_LEAGUE_ID;
}

export function usesDirectKnockoutFormat(season) {
  const year = Number(season);
  return Number.isFinite(year) && year >= FIRST_DIRECT_KNOCKOUT_SEASON;
}

export function shouldShowLeagueKnockoutTab(leagueId, season, hasKnockoutFeature = false) {
  return hasKnockoutFeature && isLigaBetPlay(leagueId) && usesDirectKnockoutFormat(season);
}
