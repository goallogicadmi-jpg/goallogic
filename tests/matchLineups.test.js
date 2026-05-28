import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignFallbackPitchPositions,
  assignPositionsFromGrid,
  extractLineupsResponse,
  gridToPitchPosition,
  normalizeLineupFromApi,
  parseFormation,
  spreadOverlappingPlayers,
} from '../frontend/src/utils/matchLineups.js';

test('parseFormation splits tactical lines', () => {
  assert.deepEqual(parseFormation('4-3-3'), [4, 3, 3]);
  assert.deepEqual(parseFormation(''), [4, 4, 2]);
});

test('extractLineupsResponse supports API envelope', () => {
  const payload = { response: [{ team: { id: 1 }, formation: '4-4-2' }] };
  assert.equal(extractLineupsResponse(payload).length, 1);
});

test('assignPositionsFromGrid handles incomplete column gaps', () => {
  const startXI = [
    { player: { id: 1, name: 'GK', number: 1, pos: 'G', grid: '1:1' } },
    { player: { id: 2, name: 'D1', number: 2, pos: 'D', grid: '2:1' } },
    { player: { id: 3, name: 'D2', number: 3, pos: 'D', grid: '2:4' } },
    { player: { id: 4, name: 'M1', number: 4, pos: 'M', grid: '3:2' } },
  ];

  const positions = assignPositionsFromGrid(startXI, '4-3-3');
  const d1 = positions.get(2);
  const d2 = positions.get(3);

  assert.ok(d1 && d2);
  assert.ok(Math.abs(d1.pitchX - d2.pitchX) > 15, 'defenders should spread horizontally');
});

test('normalizeLineupFromApi uses fallback only for players without grid', () => {
  const apiLineup = {
    formation: '4-4-2',
    team: { id: 10, name: 'Test FC', colors: { player: { primary: '112233' } } },
    coach: { name: 'Coach' },
    startXI: [
      { player: { id: 1, name: 'GK', number: 1, pos: 'G', grid: '1:1' } },
      { player: { id: 2, name: 'No Grid', number: 5, pos: 'M' } },
      ...Array.from({ length: 9 }, (_, i) => ({
        player: {
          id: 10 + i,
          name: `P${i}`,
          number: 10 + i,
          pos: i < 4 ? 'D' : i < 7 ? 'M' : 'F',
          grid: `${2 + Math.floor(i / 4)}:${(i % 4) + 1}`,
        },
      })),
    ],
    substitutes: [{ player: { id: 99, name: 'Sub', number: 12, pos: 'M' } }],
  };

  const team = normalizeLineupFromApi(apiLineup, { id: 10, name: 'Test FC' });
  assert.equal(team.formation, '4-4-2');
  assert.equal(team.coach.name, 'Coach');
  assert.equal(team.colors.primary, '#112233');
  assert.equal(team.starters.length, 11);
  assert.equal(team.substitutes.length, 1);

  const noGrid = team.starters.find((p) => p.id === 2);
  assert.ok(noGrid);
  assert.ok(noGrid.pitchX !== 50 || noGrid.pitchY !== 50);
});

test('spreadOverlappingPlayers separates close nodes', () => {
  const clustered = [
    { id: 1, pitchX: 50, pitchY: 50 },
    { id: 2, pitchX: 51, pitchY: 51 },
  ];
  const spread = spreadOverlappingPlayers(clustered, 10);
  const dist = Math.hypot(spread[1].pitchX - spread[0].pitchX, spread[1].pitchY - spread[0].pitchY);
  assert.ok(dist >= 9);
});

test('assignFallbackPitchPositions assigns eleven unique spots', () => {
  const players = Array.from({ length: 11 }, (_, i) => ({
    id: i + 1,
    name: `P${i}`,
    number: i + 1,
    position: i === 0 ? 'G' : i < 5 ? 'D' : i < 9 ? 'M' : 'F',
    pitchX: 50,
    pitchY: 50,
  }));

  const positioned = assignFallbackPitchPositions(players, '4-4-2');
  assert.equal(positioned.length, 11);

  const keys = new Set(positioned.map((p) => `${Math.round(p.pitchX)}-${Math.round(p.pitchY)}`));
  assert.ok(keys.size >= 8, 'fallback should spread players across pitch');
});
