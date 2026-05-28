import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCompareMetricRows,
  getSideCompareClass,
  isSamePlayerId,
  parseComparableNumber,
  pickWinner,
} from '../frontend/src/utils/playerCompare.js';

test('parseComparableNumber extracts numbers', () => {
  assert.equal(parseComparableNumber('3 / 2 a puerta'), 3);
  assert.equal(parseComparableNumber('—'), null);
  assert.equal(parseComparableNumber(2.5), 2.5);
});

test('pickWinner respects higherBetter flag', () => {
  assert.equal(pickWinner(3, 1, true), 'a');
  assert.equal(pickWinner(2, 5, true), 'b');
  assert.equal(pickWinner(1, 3, false), 'a');
});

test('buildCompareMetricRows compares stats', () => {
  const rows = buildCompareMetricRows(
    { goals: 2, assists: 1, keyPasses: 4 },
    { goals: 1, assists: 2, keyPasses: 2 }
  );
  const goals = rows.find((r) => r.key === 'goals');
  const assists = rows.find((r) => r.key === 'assists');
  assert.equal(goals.winner, 'a');
  assert.equal(assists.winner, 'b');
});

test('getSideCompareClass maps winner to css', () => {
  assert.equal(getSideCompareClass('a', 'a'), 'player-compare-stat--better');
  assert.equal(getSideCompareClass('a', 'b'), 'player-compare-stat--worse');
});

test('isSamePlayerId', () => {
  assert.equal(isSamePlayerId(10, '10'), true);
  assert.equal(isSamePlayerId(10, 11), false);
});
