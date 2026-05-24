import { getWorldCup2026BestThirdCombinations } from './worldCup2026BestThirdCombinations.js';

const ROUND_LABELS = {
  roundOf32: 'Ronda de 32',
  roundOf16: 'Octavos de Final',
  quarterFinals: 'Cuartos de Final',
  semiFinals: 'Semifinales',
  thirdPlace: 'Tercer Puesto',
  final: 'Final',
};

function groupPosition(group, position) {
  return { type: 'groupPosition', group, position };
}

function groupIndexPosition(index, position) {
  return { type: 'groupIndexPosition', index, position };
}

function bestThird(mappingKey, allowedGroups) {
  return { type: 'bestThird', mappingKey, allowedGroups };
}

function winnerOf(matchId, label) {
  return { type: 'winnerOf', matchId, label };
}

function loserOf(matchId, label) {
  return { type: 'loserOf', matchId, label };
}

const EURO_BEST_THIRD_COMBINATIONS = {
  ABCD: { B: '3A', C: '3D', E: '3B', F: '3C' },
  ABCE: { B: '3A', C: '3E', E: '3B', F: '3C' },
  ABCF: { B: '3A', C: '3F', E: '3B', F: '3C' },
  ABDE: { B: '3D', C: '3E', E: '3A', F: '3B' },
  ABDF: { B: '3D', C: '3F', E: '3A', F: '3B' },
  ABEF: { B: '3E', C: '3F', E: '3B', F: '3A' },
  ACDE: { B: '3E', C: '3D', E: '3C', F: '3A' },
  ACDF: { B: '3F', C: '3D', E: '3C', F: '3A' },
  ACEF: { B: '3E', C: '3F', E: '3C', F: '3A' },
  ADEF: { B: '3E', C: '3F', E: '3D', F: '3A' },
  BCDE: { B: '3E', C: '3D', E: '3B', F: '3C' },
  BCDF: { B: '3F', C: '3D', E: '3C', F: '3B' },
  BCEF: { B: '3F', C: '3E', E: '3C', F: '3B' },
  BDEF: { B: '3F', C: '3E', E: '3D', F: '3B' },
  CDEF: { B: '3F', C: '3E', E: '3D', F: '3C' },
};

function buildEuroLikeFormat({ thirdPlaceMatch = false } = {}) {
  const matches = {
    roundOf16: [
      { id: 'r16-1', home: groupPosition('B', 1), away: bestThird('B', ['A', 'D', 'E', 'F']) },
      { id: 'r16-2', home: groupPosition('A', 1), away: groupPosition('C', 2) },
      { id: 'r16-3', home: groupPosition('F', 1), away: bestThird('F', ['A', 'B', 'C']) },
      { id: 'r16-4', home: groupPosition('D', 2), away: groupPosition('E', 2) },
      { id: 'r16-5', home: groupPosition('E', 1), away: bestThird('E', ['A', 'B', 'C', 'D']) },
      { id: 'r16-6', home: groupPosition('D', 1), away: groupPosition('F', 2) },
      { id: 'r16-7', home: groupPosition('C', 1), away: bestThird('C', ['D', 'E', 'F']) },
      { id: 'r16-8', home: groupPosition('A', 2), away: groupPosition('B', 2) },
    ],
    quarterFinals: [
      { id: 'qf-1', home: winnerOf('r16-1', 'Ganador Octavos 1'), away: winnerOf('r16-2', 'Ganador Octavos 2') },
      { id: 'qf-2', home: winnerOf('r16-3', 'Ganador Octavos 3'), away: winnerOf('r16-4', 'Ganador Octavos 4') },
      { id: 'qf-3', home: winnerOf('r16-5', 'Ganador Octavos 5'), away: winnerOf('r16-6', 'Ganador Octavos 6') },
      { id: 'qf-4', home: winnerOf('r16-7', 'Ganador Octavos 7'), away: winnerOf('r16-8', 'Ganador Octavos 8') },
    ],
    semiFinals: [
      { id: 'sf-1', home: winnerOf('qf-1', 'Ganador Cuartos 1'), away: winnerOf('qf-2', 'Ganador Cuartos 2') },
      { id: 'sf-2', home: winnerOf('qf-3', 'Ganador Cuartos 3'), away: winnerOf('qf-4', 'Ganador Cuartos 4') },
    ],
    final: [
      { id: 'final-1', home: winnerOf('sf-1', 'Ganador Semifinal 1'), away: winnerOf('sf-2', 'Ganador Semifinal 2') },
    ],
  };

  if (thirdPlaceMatch) {
    matches.thirdPlace = [
      { id: 'third-1', home: loserOf('sf-1', 'Perdedor Semifinal 1'), away: loserOf('sf-2', 'Perdedor Semifinal 2') },
    ];
  }

  return {
    roundsOrder: thirdPlaceMatch
      ? ['roundOf16', 'quarterFinals', 'semiFinals', 'thirdPlace', 'final']
      : ['roundOf16', 'quarterFinals', 'semiFinals', 'final'],
    bestThirdRanking: {
      count: 4,
      criteria: ['points', 'goalDifference', 'goalsFor', 'wins'],
      combinationMap: EURO_BEST_THIRD_COMBINATIONS,
    },
    matches,
  };
}

function buildFourGroupQuarterfinalFormat({ thirdPlaceMatch = false } = {}) {
  const matches = {
    quarterFinals: [
      { id: 'qf-1', home: groupPosition('A', 1), away: groupPosition('B', 2) },
      { id: 'qf-2', home: groupPosition('B', 1), away: groupPosition('A', 2) },
      { id: 'qf-3', home: groupPosition('C', 1), away: groupPosition('D', 2) },
      { id: 'qf-4', home: groupPosition('D', 1), away: groupPosition('C', 2) },
    ],
    semiFinals: [
      { id: 'sf-1', home: winnerOf('qf-1', 'Ganador Cuartos 1'), away: winnerOf('qf-2', 'Ganador Cuartos 2') },
      { id: 'sf-2', home: winnerOf('qf-3', 'Ganador Cuartos 3'), away: winnerOf('qf-4', 'Ganador Cuartos 4') },
    ],
    final: [
      { id: 'final-1', home: winnerOf('sf-1', 'Ganador Semifinal 1'), away: winnerOf('sf-2', 'Ganador Semifinal 2') },
    ],
  };

  if (thirdPlaceMatch) {
    matches.thirdPlace = [
      { id: 'third-1', home: loserOf('sf-1', 'Perdedor Semifinal 1'), away: loserOf('sf-2', 'Perdedor Semifinal 2') },
    ];
  }

  return {
    roundsOrder: thirdPlaceMatch
      ? ['quarterFinals', 'semiFinals', 'thirdPlace', 'final']
      : ['quarterFinals', 'semiFinals', 'final'],
    matches,
  };
}

function buildNationsLeagueFinalFourFormat() {
  return {
    roundsOrder: ['semiFinals', 'thirdPlace', 'final'],
    matches: {
      semiFinals: [
        { id: 'sf-1', home: groupIndexPosition(0, 1), away: groupIndexPosition(1, 1) },
        { id: 'sf-2', home: groupIndexPosition(2, 1), away: groupIndexPosition(3, 1) },
      ],
      thirdPlace: [
        { id: 'third-1', home: loserOf('sf-1', 'Perdedor Semifinal 1'), away: loserOf('sf-2', 'Perdedor Semifinal 2') },
      ],
      final: [
        { id: 'final-1', home: winnerOf('sf-1', 'Ganador Semifinal 1'), away: winnerOf('sf-2', 'Ganador Semifinal 2') },
      ],
    },
  };
}

/** Mundial 32 equipos · 8 grupos (A–H): top 2 por grupo, sin mejores terceros. */
const WORLD_CUP_32_FORMAT = {
  roundsOrder: ['roundOf16', 'quarterFinals', 'semiFinals', 'thirdPlace', 'final'],
  matches: {
    roundOf16: [
      { id: 'r16-1', matchNumber: 1, home: groupPosition('A', 1), away: groupPosition('B', 2) },
      { id: 'r16-2', matchNumber: 2, home: groupPosition('C', 1), away: groupPosition('D', 2) },
      { id: 'r16-3', matchNumber: 3, home: groupPosition('E', 1), away: groupPosition('F', 2) },
      { id: 'r16-4', matchNumber: 4, home: groupPosition('G', 1), away: groupPosition('H', 2) },
      { id: 'r16-5', matchNumber: 5, home: groupPosition('B', 1), away: groupPosition('A', 2) },
      { id: 'r16-6', matchNumber: 6, home: groupPosition('D', 1), away: groupPosition('C', 2) },
      { id: 'r16-7', matchNumber: 7, home: groupPosition('F', 1), away: groupPosition('E', 2) },
      { id: 'r16-8', matchNumber: 8, home: groupPosition('H', 1), away: groupPosition('G', 2) },
    ],
    quarterFinals: [
      { id: 'qf-1', matchNumber: 9, home: winnerOf('r16-1', 'Ganador Partido 1'), away: winnerOf('r16-2', 'Ganador Partido 2') },
      { id: 'qf-2', matchNumber: 10, home: winnerOf('r16-3', 'Ganador Partido 3'), away: winnerOf('r16-4', 'Ganador Partido 4') },
      { id: 'qf-3', matchNumber: 11, home: winnerOf('r16-5', 'Ganador Partido 5'), away: winnerOf('r16-6', 'Ganador Partido 6') },
      { id: 'qf-4', matchNumber: 12, home: winnerOf('r16-7', 'Ganador Partido 7'), away: winnerOf('r16-8', 'Ganador Partido 8') },
    ],
    semiFinals: [
      { id: 'sf-1', matchNumber: 13, home: winnerOf('qf-1', 'Ganador Cuartos 1'), away: winnerOf('qf-2', 'Ganador Cuartos 2') },
      { id: 'sf-2', matchNumber: 14, home: winnerOf('qf-3', 'Ganador Cuartos 3'), away: winnerOf('qf-4', 'Ganador Cuartos 4') },
    ],
    thirdPlace: [
      { id: 'third-1', matchNumber: 15, home: loserOf('sf-1', 'Perdedor Semifinal 1'), away: loserOf('sf-2', 'Perdedor Semifinal 2') },
    ],
    final: [
      { id: 'final-1', matchNumber: 16, home: winnerOf('sf-1', 'Ganador Semifinal 1'), away: winnerOf('sf-2', 'Ganador Semifinal 2') },
    ],
  },
};

/** Mundial 48 equipos · 12 grupos (edición 2026+). */
const WORLD_CUP_2026_FORMAT = {
  roundsOrder: ['roundOf32', 'roundOf16', 'quarterFinals', 'semiFinals', 'thirdPlace', 'final'],
  bestThirdRanking: {
    count: 8,
    criteria: ['points', 'goalDifference', 'goalsFor'],
    combinationMap: getWorldCup2026BestThirdCombinations(),
  },
  matches: {
    roundOf32: [
      { id: 'm73', matchNumber: 73, home: groupPosition('A', 2), away: groupPosition('B', 2) },
      { id: 'm74', matchNumber: 74, home: groupPosition('E', 1), away: bestThird('E', ['A', 'B', 'C', 'D', 'F']) },
      { id: 'm75', matchNumber: 75, home: groupPosition('F', 1), away: groupPosition('C', 2) },
      { id: 'm76', matchNumber: 76, home: groupPosition('C', 1), away: groupPosition('F', 2) },
      { id: 'm77', matchNumber: 77, home: groupPosition('I', 1), away: bestThird('I', ['C', 'D', 'F', 'G', 'H']) },
      { id: 'm78', matchNumber: 78, home: groupPosition('E', 2), away: groupPosition('I', 2) },
      { id: 'm79', matchNumber: 79, home: groupPosition('A', 1), away: bestThird('A', ['C', 'E', 'F', 'H', 'I']) },
      { id: 'm80', matchNumber: 80, home: groupPosition('L', 1), away: bestThird('L', ['E', 'H', 'I', 'J', 'K']) },
      { id: 'm81', matchNumber: 81, home: groupPosition('D', 1), away: bestThird('D', ['B', 'E', 'F', 'I', 'J']) },
      { id: 'm82', matchNumber: 82, home: groupPosition('G', 1), away: bestThird('G', ['A', 'E', 'H', 'I', 'J']) },
      { id: 'm83', matchNumber: 83, home: groupPosition('K', 2), away: groupPosition('L', 2) },
      { id: 'm84', matchNumber: 84, home: groupPosition('H', 1), away: groupPosition('J', 2) },
      { id: 'm85', matchNumber: 85, home: groupPosition('B', 1), away: bestThird('B', ['E', 'F', 'G', 'I', 'J']) },
      { id: 'm86', matchNumber: 86, home: groupPosition('J', 1), away: groupPosition('H', 2) },
      { id: 'm87', matchNumber: 87, home: groupPosition('K', 1), away: bestThird('K', ['D', 'E', 'I', 'J', 'L']) },
      { id: 'm88', matchNumber: 88, home: groupPosition('D', 2), away: groupPosition('G', 2) },
    ],
    roundOf16: [
      { id: 'm89', matchNumber: 89, home: winnerOf('m74', 'Ganador Partido 74'), away: winnerOf('m77', 'Ganador Partido 77') },
      { id: 'm90', matchNumber: 90, home: winnerOf('m73', 'Ganador Partido 73'), away: winnerOf('m75', 'Ganador Partido 75') },
      { id: 'm91', matchNumber: 91, home: winnerOf('m76', 'Ganador Partido 76'), away: winnerOf('m78', 'Ganador Partido 78') },
      { id: 'm92', matchNumber: 92, home: winnerOf('m79', 'Ganador Partido 79'), away: winnerOf('m80', 'Ganador Partido 80') },
      { id: 'm93', matchNumber: 93, home: winnerOf('m83', 'Ganador Partido 83'), away: winnerOf('m84', 'Ganador Partido 84') },
      { id: 'm94', matchNumber: 94, home: winnerOf('m81', 'Ganador Partido 81'), away: winnerOf('m82', 'Ganador Partido 82') },
      { id: 'm95', matchNumber: 95, home: winnerOf('m86', 'Ganador Partido 86'), away: winnerOf('m88', 'Ganador Partido 88') },
      { id: 'm96', matchNumber: 96, home: winnerOf('m85', 'Ganador Partido 85'), away: winnerOf('m87', 'Ganador Partido 87') },
    ],
    quarterFinals: [
      { id: 'm97', matchNumber: 97, home: winnerOf('m89', 'Ganador Partido 89'), away: winnerOf('m90', 'Ganador Partido 90') },
      { id: 'm98', matchNumber: 98, home: winnerOf('m93', 'Ganador Partido 93'), away: winnerOf('m94', 'Ganador Partido 94') },
      { id: 'm99', matchNumber: 99, home: winnerOf('m91', 'Ganador Partido 91'), away: winnerOf('m92', 'Ganador Partido 92') },
      { id: 'm100', matchNumber: 100, home: winnerOf('m95', 'Ganador Partido 95'), away: winnerOf('m96', 'Ganador Partido 96') },
    ],
    semiFinals: [
      { id: 'm101', matchNumber: 101, home: winnerOf('m97', 'Ganador Partido 97'), away: winnerOf('m98', 'Ganador Partido 98') },
      { id: 'm102', matchNumber: 102, home: winnerOf('m99', 'Ganador Partido 99'), away: winnerOf('m100', 'Ganador Partido 100') },
    ],
    thirdPlace: [
      { id: 'm103', matchNumber: 103, home: loserOf('m101', 'Perdedor Semifinal 1'), away: loserOf('m102', 'Perdedor Semifinal 2') },
    ],
    final: [
      { id: 'm104', matchNumber: 104, home: winnerOf('m101', 'Ganador Semifinal 1'), away: winnerOf('m102', 'Ganador Semifinal 2') },
    ],
  },
};

const OFFICIAL_SELECTION_KNOCKOUT_FORMATS = {
  4: buildEuroLikeFormat(),
  5: buildNationsLeagueFinalFourFormat(),
  6: buildEuroLikeFormat({ thirdPlaceMatch: true }),
  7: buildEuroLikeFormat(),
  9: buildFourGroupQuarterfinalFormat({ thirdPlaceMatch: true }),
  22: buildFourGroupQuarterfinalFormat(),
  536: buildNationsLeagueFinalFourFormat(),
};

/**
 * Resuelve el formato KO oficial según competición y cantidad de grupos.
 * Mundial (id 1): 8 grupos → 32 equipos; 12 grupos → 48 equipos (2026+).
 */
export function resolveOfficialSelectionKnockoutFormat(competitionId, groupCount = 0) {
  const normalizedId = Number(competitionId);

  if (normalizedId === 1) {
    return groupCount >= 10 ? WORLD_CUP_2026_FORMAT : WORLD_CUP_32_FORMAT;
  }

  return OFFICIAL_SELECTION_KNOCKOUT_FORMATS[normalizedId] || null;
}

export function getOfficialSelectionKnockoutFormat(competitionId) {
  return resolveOfficialSelectionKnockoutFormat(competitionId, 0);
}

export function hasOfficialKnockoutFormat(competitionId) {
  const normalizedId = Number(competitionId);
  return normalizedId === 1 || Boolean(OFFICIAL_SELECTION_KNOCKOUT_FORMATS[normalizedId]);
}

/** @deprecated Usar hasOfficialKnockoutFormat desde officialKnockoutFormats.js */
export function hasOfficialSelectionKnockoutFormat(competitionId) {
  return hasOfficialKnockoutFormat(competitionId);
}

export { ROUND_LABELS, WORLD_CUP_32_FORMAT, WORLD_CUP_2026_FORMAT };
