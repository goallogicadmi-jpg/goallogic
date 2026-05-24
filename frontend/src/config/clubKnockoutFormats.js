/**
 * Formatos oficiales de eliminatorias — copas de clubes CONMEBOL.
 */

function groupPosition(group, position) {
  return { type: 'groupPosition', group, position };
}

function groupPositionInCompetition(competitionId, group, position) {
  return { type: 'groupPositionInCompetition', competitionId, group, position };
}

function winnerOf(matchId, label) {
  return { type: 'winnerOf', matchId, label };
}

/** Copa Libertadores — 8 grupos, top 2 → octavos (cruce fijo CONMEBOL). */
const LIBERTADORES_KNOCKOUT_FORMAT = {
  roundsOrder: ['roundOf16', 'quarterFinals', 'semiFinals', 'final'],
  matches: {
    roundOf16: [
      { id: 'r16-1', matchNumber: 1, home: groupPosition('A', 1), away: groupPosition('H', 2) },
      { id: 'r16-2', matchNumber: 2, home: groupPosition('B', 1), away: groupPosition('G', 2) },
      { id: 'r16-3', matchNumber: 3, home: groupPosition('C', 1), away: groupPosition('F', 2) },
      { id: 'r16-4', matchNumber: 4, home: groupPosition('D', 1), away: groupPosition('E', 2) },
      { id: 'r16-5', matchNumber: 5, home: groupPosition('E', 1), away: groupPosition('D', 2) },
      { id: 'r16-6', matchNumber: 6, home: groupPosition('F', 1), away: groupPosition('C', 2) },
      { id: 'r16-7', matchNumber: 7, home: groupPosition('G', 1), away: groupPosition('B', 2) },
      { id: 'r16-8', matchNumber: 8, home: groupPosition('H', 1), away: groupPosition('A', 2) },
    ],
    quarterFinals: [
      { id: 'qf-1', matchNumber: 9, home: winnerOf('r16-1', 'Ganador Partido 1'), away: winnerOf('r16-4', 'Ganador Partido 4') },
      { id: 'qf-2', matchNumber: 10, home: winnerOf('r16-2', 'Ganador Partido 2'), away: winnerOf('r16-3', 'Ganador Partido 3') },
      { id: 'qf-3', matchNumber: 11, home: winnerOf('r16-5', 'Ganador Partido 5'), away: winnerOf('r16-8', 'Ganador Partido 8') },
      { id: 'qf-4', matchNumber: 12, home: winnerOf('r16-6', 'Ganador Partido 6'), away: winnerOf('r16-7', 'Ganador Partido 7') },
    ],
    semiFinals: [
      { id: 'sf-1', matchNumber: 13, home: winnerOf('qf-1', 'Ganador Cuartos 1'), away: winnerOf('qf-2', 'Ganador Cuartos 2') },
      { id: 'sf-2', matchNumber: 14, home: winnerOf('qf-3', 'Ganador Cuartos 3'), away: winnerOf('qf-4', 'Ganador Cuartos 4') },
    ],
    final: [
      { id: 'final-1', matchNumber: 15, home: winnerOf('sf-1', 'Ganador Semifinal 1'), away: winnerOf('sf-2', 'Ganador Semifinal 2') },
    ],
  },
};

const SUDAMERICANA_ID = 11;
const LIBERTADORES_ID = 13;

/**
 * Copa Sudamericana — playoff (2° SUD vs 3° LIB) + octavos con 1° SUD.
 * Requiere grupos de Libertadores (id 13) en groupsByCompetition al resolver.
 */
const SUDAMERICANA_KNOCKOUT_FORMAT = {
  roundsOrder: ['playoff', 'roundOf16', 'quarterFinals', 'semiFinals', 'final'],
  linkedCompetitions: [LIBERTADORES_ID],
  matches: {
    playoff: [
      { id: 'po-1', matchNumber: 1, home: groupPositionInCompetition(SUDAMERICANA_ID, 'A', 2), away: groupPositionInCompetition(LIBERTADORES_ID, 'C', 3) },
      { id: 'po-2', matchNumber: 2, home: groupPositionInCompetition(SUDAMERICANA_ID, 'B', 2), away: groupPositionInCompetition(LIBERTADORES_ID, 'F', 3) },
      { id: 'po-3', matchNumber: 3, home: groupPositionInCompetition(SUDAMERICANA_ID, 'C', 2), away: groupPositionInCompetition(LIBERTADORES_ID, 'A', 3) },
      { id: 'po-4', matchNumber: 4, home: groupPositionInCompetition(SUDAMERICANA_ID, 'D', 2), away: groupPositionInCompetition(LIBERTADORES_ID, 'H', 3) },
      { id: 'po-5', matchNumber: 5, home: groupPositionInCompetition(SUDAMERICANA_ID, 'E', 2), away: groupPositionInCompetition(LIBERTADORES_ID, 'B', 3) },
      { id: 'po-6', matchNumber: 6, home: groupPositionInCompetition(SUDAMERICANA_ID, 'F', 2), away: groupPositionInCompetition(LIBERTADORES_ID, 'G', 3) },
      { id: 'po-7', matchNumber: 7, home: groupPositionInCompetition(SUDAMERICANA_ID, 'G', 2), away: groupPositionInCompetition(LIBERTADORES_ID, 'D', 3) },
      { id: 'po-8', matchNumber: 8, home: groupPositionInCompetition(SUDAMERICANA_ID, 'H', 2), away: groupPositionInCompetition(LIBERTADORES_ID, 'E', 3) },
    ],
    roundOf16: [
      { id: 'r16-1', matchNumber: 9, home: groupPosition('A', 1), away: winnerOf('po-8', 'Ganador Playoff 8') },
      { id: 'r16-2', matchNumber: 10, home: groupPosition('B', 1), away: winnerOf('po-7', 'Ganador Playoff 7') },
      { id: 'r16-3', matchNumber: 11, home: groupPosition('C', 1), away: winnerOf('po-6', 'Ganador Playoff 6') },
      { id: 'r16-4', matchNumber: 12, home: groupPosition('D', 1), away: winnerOf('po-5', 'Ganador Playoff 5') },
      { id: 'r16-5', matchNumber: 13, home: groupPosition('E', 1), away: winnerOf('po-4', 'Ganador Playoff 4') },
      { id: 'r16-6', matchNumber: 14, home: groupPosition('F', 1), away: winnerOf('po-3', 'Ganador Playoff 3') },
      { id: 'r16-7', matchNumber: 15, home: groupPosition('G', 1), away: winnerOf('po-2', 'Ganador Playoff 2') },
      { id: 'r16-8', matchNumber: 16, home: groupPosition('H', 1), away: winnerOf('po-1', 'Ganador Playoff 1') },
    ],
    quarterFinals: [
      { id: 'qf-1', matchNumber: 17, home: winnerOf('r16-1', 'Ganador Octavos 1'), away: winnerOf('r16-8', 'Ganador Octavos 8') },
      { id: 'qf-2', matchNumber: 18, home: winnerOf('r16-2', 'Ganador Octavos 2'), away: winnerOf('r16-7', 'Ganador Octavos 7') },
      { id: 'qf-3', matchNumber: 19, home: winnerOf('r16-3', 'Ganador Octavos 3'), away: winnerOf('r16-6', 'Ganador Octavos 6') },
      { id: 'qf-4', matchNumber: 20, home: winnerOf('r16-4', 'Ganador Octavos 4'), away: winnerOf('r16-5', 'Ganador Octavos 5') },
    ],
    semiFinals: [
      { id: 'sf-1', matchNumber: 21, home: winnerOf('qf-1', 'Ganador Cuartos 1'), away: winnerOf('qf-4', 'Ganador Cuartos 4') },
      { id: 'sf-2', matchNumber: 22, home: winnerOf('qf-2', 'Ganador Cuartos 2'), away: winnerOf('qf-3', 'Ganador Cuartos 3') },
    ],
    final: [
      { id: 'final-1', matchNumber: 23, home: winnerOf('sf-1', 'Ganador Semifinal 1'), away: winnerOf('sf-2', 'Ganador Semifinal 2') },
    ],
  },
};

const CLUB_KNOCKOUT_FORMATS = {
  13: LIBERTADORES_KNOCKOUT_FORMAT,
  11: SUDAMERICANA_KNOCKOUT_FORMAT,
};

export function resolveOfficialClubKnockoutFormat(competitionId) {
  return CLUB_KNOCKOUT_FORMATS[Number(competitionId)] || null;
}

export function hasOfficialClubKnockoutFormat(competitionId) {
  return Boolean(CLUB_KNOCKOUT_FORMATS[Number(competitionId)]);
}

export function getLinkedCompetitionIdsForKnockout(competitionId) {
  const format = CLUB_KNOCKOUT_FORMATS[Number(competitionId)];
  return format?.linkedCompetitions ? [...format.linkedCompetitions] : [];
}

export { LIBERTADORES_ID, SUDAMERICANA_ID, LIBERTADORES_KNOCKOUT_FORMAT, SUDAMERICANA_KNOCKOUT_FORMAT };
