import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMatchMomentumFromTimeline,
  buildMomentumAxisMarks,
  buildMobileMomentumAxisMarks,
  resolveMomentumChartMaxMinute,
  smoothMomentumValues,
  spreadGoalMarkers,
} from '../frontend/src/utils/matchMomentum.js';

const sampleEvents = [
  {
    id: 'g1',
    kind: 'goal',
    side: 'home',
    sortMinute: 12,
    minuteLabel: '12',
    icon: '⚽',
    teamColor: '#1565c0',
    playerName: 'Striker',
  },
  {
    id: 'g2',
    kind: 'goal',
    side: 'away',
    sortMinute: 58,
    minuteLabel: '58',
    icon: '⚽',
    teamColor: '#c62828',
    playerName: 'Forward',
  },
  {
    id: 'c1',
    kind: 'card_yellow',
    side: 'away',
    sortMinute: 34,
    minuteLabel: '34',
    icon: '🟨',
    teamColor: '#c62828',
    playerName: 'Defender',
  },
];

test('resolveMomentumChartMaxMinute defaults to 90 and extends for extra time', () => {
  assert.equal(resolveMomentumChartMaxMinute(67), 90);
  assert.equal(resolveMomentumChartMaxMinute(95), 105);
  assert.equal(resolveMomentumChartMaxMinute(118), 120);
});

test('buildMomentumAxisMarks includes regulation labels and ET when needed', () => {
  const regular = buildMomentumAxisMarks(90);
  assert.ok(regular.some((mark) => mark.label === 'MT'));
  assert.ok(regular.some((mark) => mark.label === 'FP'));

  const extra = buildMomentumAxisMarks(120);
  assert.ok(extra.some((mark) => mark.minute === 105));
});

test('smoothMomentumValues averages neighboring buckets', () => {
  const smoothed = smoothMomentumValues([0, 10, 0], 3);
  assert.equal(smoothed[1], 10 / 3);
});

test('buildMatchMomentumFromTimeline creates bars and goal markers', () => {
  const result = buildMatchMomentumFromTimeline(sampleEvents, { chartMaxMinute: 90 });

  assert.equal(result.chartMaxMinute, 90);
  assert.equal(result.bars.length, 18);
  assert.equal(result.goalMarkers.length, 2);
  assert.ok(result.bars.some((bar) => bar.side === 'home' || bar.side === 'away' || bar.side === 'neutral'));
});

test('buildMatchMomentumFromTimeline credits own goals to the opponent', () => {
  const ownGoal = [{
    id: 'og1',
    kind: 'goal_own',
    side: 'home',
    sortMinute: 20,
    minuteLabel: '20',
    icon: '🥅',
    teamColor: '#1565c0',
  }];

  const result = buildMatchMomentumFromTimeline(ownGoal, { chartMaxMinute: 90 });
  const bucket = result.bars[Math.floor(20 / 5)];
  assert.equal(bucket.side, 'away');
});

test('buildMobileMomentumAxisMarks reduces labels for compact screens', () => {
  const mobile = buildMobileMomentumAxisMarks(90);
  assert.ok(mobile.length <= 6);
  assert.ok(mobile.some((mark) => mark.minute === 0));
  assert.ok(mobile.some((mark) => mark.label === 'MT' || mark.minute === 45));
  assert.ok(mobile.some((mark) => mark.label === 'FP' || mark.minute === 90));

  const ultra = buildMobileMomentumAxisMarks(90, { ultraCompact: true });
  assert.ok(ultra.length <= 4);
});

test('spreadGoalMarkers separates overlapping goal icons', () => {
  const markers = spreadGoalMarkers([
    { id: 'g1', leftPercent: 50, side: 'home' },
    { id: 'g2', leftPercent: 51, side: 'away' },
  ]);

  assert.ok(markers[1].verticalOffset > 0 || markers[1].leftPercent > markers[0].leftPercent);
});
