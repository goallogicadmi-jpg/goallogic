import test from 'node:test';
import assert from 'node:assert/strict';
import {
  averagePoints,
  buildTacticalViewResponse,
  linkStrokeWidth,
} from '../utils/tacticalView.js';

test('averagePoints computes centroid', () => {
  const avg = averagePoints([
    { x: 10, y: 20 },
    { x: 30, y: 40 },
  ]);
  assert.equal(avg.x, 20);
  assert.equal(avg.y, 30);
});

test('buildTacticalViewResponse returns team tactical data', () => {
  const lineups = [
    {
      formation: '4-3-3',
      team: { id: 1, name: 'Home', colors: { player: { primary: '111111' } } },
      startXI: [
        { player: { id: 10, name: 'GK', number: 1, pos: 'G', grid: '1:1' } },
        { player: { id: 11, name: 'ST', number: 9, pos: 'F', grid: '4:2' } },
        { player: { id: 12, name: 'CM', number: 8, pos: 'M', grid: '3:2' } },
        { player: { id: 13, name: 'CB', number: 4, pos: 'D', grid: '2:2' } },
        { player: { id: 14, name: 'LB', number: 3, pos: 'D', grid: '2:1' } },
        { player: { id: 15, name: 'RB', number: 2, pos: 'D', grid: '2:3' } },
      ],
      substitutes: [],
    },
    {
      formation: '4-4-2',
      team: { id: 2, name: 'Away' },
      startXI: [
        { player: { id: 20, name: 'GK2', number: 1, pos: 'G', grid: '1:1' } },
        { player: { id: 21, name: 'ST2', number: 9, pos: 'F', grid: '4:2' } },
        { player: { id: 22, name: 'CM2', number: 6, pos: 'M', grid: '3:2' } },
        { player: { id: 23, name: 'CB2', number: 5, pos: 'D', grid: '2:2' } },
        { player: { id: 24, name: 'LB2', number: 3, pos: 'D', grid: '2:1' } },
        { player: { id: 25, name: 'RB2', number: 2, pos: 'D', grid: '2:3' } },
      ],
      substitutes: [],
    },
  ];

  const events = [
    {
      type: 'Goal',
      detail: 'Normal Goal',
      time: { elapsed: 55 },
      team: { id: 1 },
      player: { id: 11, name: 'ST' },
      assist: { id: 12, name: 'CM' },
    },
  ];

  const playersFixture = [
    {
      team: { id: 1 },
      players: [
        {
          player: { id: 10, name: 'GK' },
          statistics: [{ games: { minutes: 90, position: 'G' }, passes: { total: 20 } }],
        },
        {
          player: { id: 11, name: 'ST' },
          statistics: [{ games: { minutes: 90, position: 'F' }, passes: { total: 15, key: 2 }, goals: { total: 1 } }],
        },
        {
          player: { id: 12, name: 'CM' },
          statistics: [{ games: { minutes: 90, position: 'M' }, passes: { total: 55, key: 4 }, goals: { assists: 1 } }],
        },
        {
          player: { id: 13, name: 'CB' },
          statistics: [{ games: { minutes: 90, position: 'D' }, passes: { total: 40 } }],
        },
        {
          player: { id: 14, name: 'LB' },
          statistics: [{ games: { minutes: 90, position: 'D' }, passes: { total: 35 } }],
        },
        {
          player: { id: 15, name: 'RB' },
          statistics: [{ games: { minutes: 90, position: 'D' }, passes: { total: 38 } }],
        },
      ],
    },
  ];

  const result = buildTacticalViewResponse({
    lineups,
    events,
    playersFixture,
    homeTeamId: 1,
    awayTeamId: 2,
  });

  assert.equal(result.home.hasData, true);
  assert.ok(result.home.players.length >= 6);
  assert.ok(result.home.links.length > 0);
  assert.ok(result.home.zoneIntensity.length >= 0);

  const assistLink = result.home.links.find(
    (l) => String(l.fromId) === '12' && String(l.toId) === '11'
  );
  assert.ok(assistLink);
  assert.ok(assistLink.count >= 4);
});

test('linkStrokeWidth scales with count', () => {
  assert.ok(linkStrokeWidth(10, 10) > linkStrokeWidth(1, 10));
});
