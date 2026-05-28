import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPlayerStatsViewModel,
  extractFixturePlayerResponse,
  normalizeFixturePlayerStats,
  translatePlayerPosition,
} from '../frontend/src/utils/playerFixtureStats.js';

test('extractFixturePlayerResponse unwraps response', () => {
  const entry = { player: { id: 1, name: 'Test' }, statistics: [{}] };
  assert.deepEqual(extractFixturePlayerResponse({ response: entry }), entry);
});

test('normalizeFixturePlayerStats maps match statistics', () => {
  const entry = {
    player: { id: 10, name: 'Haaland', age: 24, nationality: 'Norway' },
    team: { id: 50, name: 'Man City' },
    statistics: [
      {
        games: { minutes: 90, number: 9, position: 'F' },
        goals: { total: 2, assists: 1 },
        shots: { total: 5, on: 3 },
        passes: { key: 2 },
        duels: { won: 4 },
        fouls: { committed: 1, drawn: 2 },
        cards: { yellow: 1, red: 0 },
      },
    ],
  };

  const result = normalizeFixturePlayerStats(entry);
  assert.equal(result.hasStats, true);
  assert.equal(result.matchStats.goals, 2);
  assert.equal(result.matchStats.assists, 1);
  assert.equal(result.matchStats.shotsOn, 3);
  assert.equal(result.player.nationality, 'Norway');
});

test('buildPlayerStatsViewModel returns stat cards when has stats', () => {
  const vm = buildPlayerStatsViewModel({
    player: { id: 1, name: 'A' },
    statistics: [{ goals: { total: 1, assists: 0 }, games: { minutes: 45 } }],
  });
  assert.equal(vm.hasStats, true);
  assert.ok(vm.statCards.some((c) => c.key === 'goals'));
});

test('normalizeFixturePlayerStats without API entry uses lineup fallback', () => {
  const result = normalizeFixturePlayerStats(null, {
    id: 99,
    name: 'Bench',
    number: 12,
    position: 'M',
  });
  assert.equal(result.hasStats, false);
  assert.equal(result.player.name, 'Bench');
});

test('translatePlayerPosition', () => {
  assert.equal(translatePlayerPosition('F'), 'Delantero');
  assert.equal(translatePlayerPosition('Midfielder'), 'Mediocampista');
});
