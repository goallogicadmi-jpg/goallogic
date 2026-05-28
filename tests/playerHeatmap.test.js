import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPlayerHeatmapPoints,
  extractRawEventCoords,
  gridToPitchPosition,
  sampleHeatmapPoints,
} from '../utils/playerHeatmap.js';

test('gridToPitchPosition maps grid to 0-100 with attack up', () => {
  const gk = gridToPitchPosition('1:1', '4-3-3');
  const fw = gridToPitchPosition('4:2', '4-3-3', { 4: 3 });
  assert.ok(gk);
  assert.ok(fw);
  assert.ok(fw.y < gk.y, 'forwards should be higher on pitch (lower y)');
});

test('extractRawEventCoords normalizes 0-1 and 0-100', () => {
  assert.deepEqual(extractRawEventCoords({ position: { x: 0.5, y: 0.2 } }), {
    x: 50,
    y: 20,
  });
  assert.deepEqual(extractRawEventCoords({ pos: { x: 80, y: 30 } }), {
    x: 80,
    y: 30,
  });
});

test('buildPlayerHeatmapPoints uses events and stats', () => {
  const lineups = [
    {
      formation: '4-3-3',
      team: { id: 1 },
      startXI: [
        { player: { id: 10, name: 'Mid', grid: '3:2', pos: 'M' } },
      ],
      substitutes: [],
    },
  ];

  const events = [
    {
      type: 'Goal',
      detail: 'Normal Goal',
      time: { elapsed: 67 },
      player: { id: 10, name: 'Mid' },
    },
    {
      type: 'Card',
      detail: 'Yellow Card',
      time: { elapsed: 80 },
      player: { id: 10, name: 'Mid' },
    },
  ];

  const playerEntry = {
    player: { id: 10 },
    statistics: [
      {
        games: { minutes: 90, position: 'M' },
        passes: { total: 80 },
        duels: { total: 12, won: 7 },
      },
    ],
  };

  const result = buildPlayerHeatmapPoints({
    events,
    lineups,
    playerEntry,
    playerId: 10,
  });

  assert.ok(result.points.length > 0);
  assert.ok(result.points.length <= 300);
  assert.equal(result.source, 'events_inferred');
  result.points.forEach((p) => {
    assert.ok(p.x >= 0 && p.x <= 100);
    assert.ok(p.y >= 0 && p.y <= 100);
  });
});

test('sampleHeatmapPoints limits count', () => {
  const many = Array.from({ length: 500 }, (_, i) => ({ x: i % 100, y: i % 100, weight: 1 }));
  const sampled = sampleHeatmapPoints(many, 300);
  assert.equal(sampled.length, 300);
});

test('buildPlayerHeatmapPoints returns empty without lineup', () => {
  const result = buildPlayerHeatmapPoints({
    events: [],
    lineups: [],
    playerId: 99,
  });
  assert.equal(result.points.length, 0);
  assert.equal(result.source, 'none');
});
