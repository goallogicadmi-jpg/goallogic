import test from 'node:test';
import assert from 'node:assert/strict';
import {
  didFixtureScoreChange,
  selectCardTimelineEvents,
} from '../frontend/src/utils/matchCardHelpers.js';

test('selectCardTimelineEvents keeps key kinds and limits count', () => {
  const events = [
    { id: '1', kind: 'card_yellow', sortMinute: 10 },
    { id: '2', kind: 'goal', sortMinute: 20 },
    { id: '3', kind: 'subst', sortMinute: 30 },
    { id: '4', kind: 'goal', sortMinute: 40 },
    { id: '5', kind: 'card_red', sortMinute: 50 },
    { id: '6', kind: 'goal', sortMinute: 60 },
    { id: '7', kind: 'generic', sortMinute: 70 },
  ];

  const selected = selectCardTimelineEvents(events, 4);
  assert.equal(selected.length, 4);
  assert.equal(selected[0].id, '3');
  assert.ok(selected.every((event) => event.kind !== 'generic'));
});

test('didFixtureScoreChange detects increased goals only', () => {
  assert.equal(didFixtureScoreChange(2, 1, 1, 1), true);
  assert.equal(didFixtureScoreChange(1, 2, 1, 1), true);
  assert.equal(didFixtureScoreChange(1, 1, 1, 1), false);
  assert.equal(didFixtureScoreChange(null, 1, 0, 0), false);
});
