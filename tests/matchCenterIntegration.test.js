import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTimelineFromEvents,
  buildTimelineEventId,
  getTimelineEventTypeLabel,
} from '../frontend/src/utils/matchEvents.js';
import {
  buildMatchMomentumFromTimeline,
  buildMomentumAxisMarks,
} from '../frontend/src/utils/matchMomentum.js';

const homeMeta = { id: 1, name: 'Home FC', logo: null };
const awayMeta = { id: 2, name: 'Away FC', logo: null };

test('buildTimelineFromEvents keeps chronological order with extra time', () => {
  const events = [
    {
      type: 'Goal',
      detail: 'Normal Goal',
      time: { elapsed: 90, extra: 2 },
      team: { id: 1 },
      player: { id: 10, name: 'Home Scorer' },
    },
    {
      type: 'Goal',
      detail: 'Normal Goal',
      time: { elapsed: 15 },
      team: { id: 2 },
      player: { id: 20, name: 'Away Scorer' },
    },
    {
      type: 'subst',
      detail: 'Substitution 1',
      time: { elapsed: 67 },
      team: { id: 1 },
      player: { id: 11, name: 'Out Player' },
      assist: { id: 12, name: 'In Player' },
    },
  ];

  const timeline = buildTimelineFromEvents(events, homeMeta, awayMeta);
  assert.equal(timeline.length, 3);
  assert.equal(timeline[0].minuteLabel, '15');
  assert.equal(timeline[1].minuteLabel, '67');
  assert.equal(timeline[2].minuteLabel, '90+2');
  assert.equal(getTimelineEventTypeLabel(timeline[0].kind), 'Gol');
});

test('timeline event ids remain stable across repeated normalizations', () => {
  const event = {
    type: 'Card',
    detail: 'Yellow Card',
    time: { elapsed: 34 },
    team: { id: 2 },
    player: { id: 7, name: 'Defender' },
  };

  const first = buildTimelineFromEvents([event], homeMeta, awayMeta)[0];
  const second = buildTimelineFromEvents([event], homeMeta, awayMeta)[0];

  assert.equal(first.id, second.id);
  assert.equal(first.id, buildTimelineEventId(event, first.kind));
});

test('momentum chart supports extra time axis marks', () => {
  const timeline = buildTimelineFromEvents([
    {
      type: 'Goal',
      detail: 'Normal Goal',
      time: { elapsed: 101 },
      team: { id: 1 },
      player: { id: 9, name: 'ET Scorer' },
    },
  ], homeMeta, awayMeta);

  const momentum = buildMatchMomentumFromTimeline(timeline, { chartMaxMinute: 105 });
  const marks = buildMomentumAxisMarks(momentum.chartMaxMinute);

  assert.equal(momentum.chartMaxMinute, 105);
  assert.ok(marks.some((mark) => mark.minute === 105));
  assert.equal(momentum.goalMarkers.length, 1);
  assert.ok(momentum.goalMarkers[0].leftPercent > 0);
});
