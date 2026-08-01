import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBetStatsFromList,
  computeCurrentWinStreak,
  isSportsAnalyst,
} from '../utils/analystStats.js';

test('isSportsAnalyst detects analista role', () => {
  assert.equal(isSportsAnalyst({ role: 'analista' }), true);
  assert.equal(isSportsAnalyst({ role: 'usuario' }), false);
});

test('computeBetStatsFromList calculates ROI and win rate', () => {
  const stats = computeBetStatsFromList([
    { stake: 10, cuota: 2, resultado: 'ganada', created_at: new Date('2026-01-02') },
    { stake: 10, cuota: 1.5, resultado: 'perdida', created_at: new Date('2026-01-01') },
  ]);

  assert.equal(stats.totalGanadas, 1);
  assert.equal(stats.totalPerdidas, 1);
  assert.equal(stats.winRate, 50);
  assert.equal(stats.roi, 0);
});

test('computeCurrentWinStreak counts consecutive wins from latest', () => {
  const streak = computeCurrentWinStreak([
    { resultado: 'ganada', created_at: new Date('2026-01-03') },
    { resultado: 'ganada', created_at: new Date('2026-01-02') },
    { resultado: 'perdida', created_at: new Date('2026-01-01') },
  ]);
  assert.equal(streak, 2);
});
