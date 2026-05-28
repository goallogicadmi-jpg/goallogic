/**
 * Utilidades para comparación A vs B de jugadores en un mismo partido.
 */

/** @typedef {'a'|'b'|'tie'|null} CompareWinner */

/**
 * @param {*} value
 */
export function parseComparableNumber(value) {
  if (value == null || value === '—' || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const str = String(value);
  const match = str.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {Object|null} matchStats
 */
export const COMPARE_METRICS = [
  { key: 'goals', label: 'Goles', getValue: (m) => m?.goals, higherBetter: true },
  { key: 'assists', label: 'Asistencias', getValue: (m) => m?.assists, higherBetter: true },
  { key: 'xg', label: 'xG', getValue: (m) => m?.xg, higherBetter: true },
  { key: 'xa', label: 'xA', getValue: (m) => m?.xa, higherBetter: true },
  { key: 'shotsTotal', label: 'Tiros', getValue: (m) => m?.shotsTotal, higherBetter: true },
  { key: 'shotsOn', label: 'Tiros a puerta', getValue: (m) => m?.shotsOn, higherBetter: true },
  { key: 'keyPasses', label: 'Pases clave', getValue: (m) => m?.keyPasses, higherBetter: true },
  { key: 'duelsWon', label: 'Duelos ganados', getValue: (m) => m?.duelsWon, higherBetter: true },
  {
    key: 'foulsCommitted',
    label: 'Faltas cometidas',
    getValue: (m) => m?.foulsCommitted,
    higherBetter: false,
  },
  {
    key: 'foulsDrawn',
    label: 'Faltas recibidas',
    getValue: (m) => m?.foulsDrawn,
    higherBetter: true,
  },
  {
    key: 'yellowCards',
    label: 'Tarjetas amarillas',
    getValue: (m) => m?.yellowCards,
    higherBetter: false,
  },
  {
    key: 'redCards',
    label: 'Tarjetas rojas',
    getValue: (m) => m?.redCards,
    higherBetter: false,
  },
];

/**
 * @param {number|null} numA
 * @param {number|null} numB
 * @param {boolean} higherBetter
 * @returns {CompareWinner}
 */
export function pickWinner(numA, numB, higherBetter = true) {
  if (numA == null && numB == null) return null;
  if (numA == null) return 'b';
  if (numB == null) return 'a';
  if (numA === numB) return 'tie';

  if (higherBetter) {
    return numA > numB ? 'a' : 'b';
  }
  return numA < numB ? 'a' : 'b';
}

/**
 * @param {Object|null} statsA
 * @param {Object|null} statsB
 */
export function buildCompareMetricRows(statsA, statsB) {
  return COMPARE_METRICS.map((metric) => {
    const rawA = metric.getValue(statsA);
    const rawB = metric.getValue(statsB);
    const numA = parseComparableNumber(rawA);
    const numB = parseComparableNumber(rawB);
    const winner = pickWinner(numA, numB, metric.higherBetter);

    const format = (v) => (v == null ? '—' : String(v));

    return {
      key: metric.key,
      label: metric.label,
      valueA: format(rawA),
      valueB: format(rawB),
      winner,
    };
  });
}

/**
 * @param {'a'|'b'} side
 * @param {CompareWinner} winner
 */
export function getSideCompareClass(side, winner) {
  if (!winner || winner === 'tie') return '';
  if (winner === side) return 'player-compare-stat--better';
  return 'player-compare-stat--worse';
}

/**
 * @param {string|number} playerAId
 * @param {string|number} playerBId
 */
export function isSamePlayerId(playerAId, playerBId) {
  if (playerAId == null || playerBId == null) return false;
  return String(playerAId) === String(playerBId);
}
