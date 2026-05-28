import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEventsByPlayer,
  buildLiveEventToastMessage,
  buildPlayerEventKey,
  buildSubstitutionKey,
  buildTimelineFromEvents,
  buildTimelineEventId,
  extractEventsResponse,
  extractPlayerPitchEvents,
  extractSubstitutionsFromEvents,
  formatEventMinute,
  getEventAnimationClass,
  getTimelineEventKind,
  getTimelineMaxMinute,
  getPlayerPitchEventKind,
  isImportantTimelineKind,
  isFixtureFinished,
  isFixtureLive,
  isPlayerPitchEvent,
  isSubstitutionEvent,
  normalizePlayerPitchEvent,
  normalizeSubstitutionEvent,
  pairSubstitutionsWithFixture,
} from '../frontend/src/utils/matchEvents.js';

test('extractEventsResponse unwraps API envelopes', () => {
  const events = [{ type: 'Goal' }];
  assert.deepEqual(extractEventsResponse({ response: events }), events);
  assert.deepEqual(extractEventsResponse(events), events);
});

test('isSubstitutionEvent detects subst type', () => {
  assert.equal(isSubstitutionEvent({ type: 'subst' }), true);
  assert.equal(isSubstitutionEvent({ type: 'Goal' }), false);
  assert.equal(isSubstitutionEvent({ detail: 'Substitution 1' }), true);
});

test('normalizeSubstitutionEvent maps player out and assist in', () => {
  const event = {
    type: 'subst',
    time: { elapsed: 67, extra: null },
    team: { id: 33 },
    player: { id: 10, name: 'Salah' },
    assist: { id: 11, name: 'Jota' },
  };
  const sub = normalizeSubstitutionEvent(event);
  assert.equal(sub.playerOut.name, 'Salah');
  assert.equal(sub.playerIn.name, 'Jota');
  assert.equal(sub.minuteLabel, '67');
  assert.equal(sub.teamId, 33);
});

test('formatEventMinute shows extra time', () => {
  assert.equal(formatEventMinute({ time: { elapsed: 90, extra: 3 } }), '90+3');
});

test('extractSubstitutionsFromEvents sorts chronologically', () => {
  const events = [
    { type: 'subst', time: { elapsed: 80 }, team: { id: 1 }, player: { name: 'B' }, assist: { name: 'C' } },
    { type: 'subst', time: { elapsed: 60 }, team: { id: 1 }, player: { name: 'A' }, assist: { name: 'D' } },
  ];
  const subs = extractSubstitutionsFromEvents(events);
  assert.equal(subs[0].minute, 60);
  assert.equal(subs[1].minute, 80);
});

test('pairSubstitutionsWithFixture splits by team id', () => {
  const events = [
    { type: 'subst', time: { elapsed: 70 }, team: { id: 100 }, player: { id: 1, name: 'H1' }, assist: { id: 2, name: 'H2' } },
    { type: 'subst', time: { elapsed: 75 }, team: { id: 200 }, player: { id: 3, name: 'A1' }, assist: { id: 4, name: 'A2' } },
  ];
  const { substitutionsHome, substitutionsAway } = pairSubstitutionsWithFixture(
    events,
    { id: 100 },
    { id: 200 }
  );
  assert.equal(substitutionsHome.length, 1);
  assert.equal(substitutionsAway.length, 1);
  assert.equal(substitutionsHome[0].playerOut.name, 'H1');
});

test('buildSubstitutionKey is stable for deduplication', () => {
  const event = {
    team: { id: 5 },
    time: { elapsed: 45, extra: 0 },
    player: { id: 9 },
    assist: { id: 12 },
  };
  assert.equal(buildSubstitutionKey(event), buildSubstitutionKey(event));
});

test('isFixtureLive and isFixtureFinished read status short', () => {
  assert.equal(isFixtureLive({ fixture: { status: { short: '2H' } } }), true);
  assert.equal(isFixtureLive({ fixture: { status: { short: 'NS' } } }), false);
  assert.equal(isFixtureFinished({ fixture: { status: { short: 'FT' } } }), true);
});

test('getPlayerPitchEventKind maps API types', () => {
  assert.equal(getPlayerPitchEventKind({ type: 'Goal', detail: 'Normal Goal' }), 'goal');
  assert.equal(getPlayerPitchEventKind({ type: 'Goal', detail: 'Own Goal' }), 'goal_own');
  assert.equal(getPlayerPitchEventKind({ type: 'Goal', detail: 'Penalty' }), 'goal_penalty');
  assert.equal(getPlayerPitchEventKind({ type: 'Goal', detail: 'Missed Penalty' }), 'penalty_missed');
  assert.equal(getPlayerPitchEventKind({ type: 'Card', detail: 'Yellow Card' }), 'card_yellow');
  assert.equal(getPlayerPitchEventKind({ type: 'Card', detail: 'Red Card' }), 'card_red');
  assert.equal(getPlayerPitchEventKind({ type: 'Card', detail: 'Second Yellow card' }), 'card_second_yellow');
  assert.equal(getPlayerPitchEventKind({ type: 'Var', detail: 'Goal cancelled' }), 'var');
  assert.equal(getPlayerPitchEventKind({ type: 'Injury' }), 'injury');
});

test('isPlayerPitchEvent excludes substitutions', () => {
  assert.equal(isPlayerPitchEvent({ type: 'subst' }), false);
  assert.equal(isPlayerPitchEvent({ type: 'Goal', detail: 'Normal Goal' }), true);
});

test('normalizePlayerPitchEvent maps scorer and assist', () => {
  const ev = normalizePlayerPitchEvent({
    type: 'Goal',
    detail: 'Normal Goal',
    time: { elapsed: 23 },
    player: { id: 99, name: 'Haaland' },
    assist: { id: 7, name: 'Foden' },
  });
  assert.equal(ev.playerId, 99);
  assert.equal(ev.kind, 'goal');
  assert.ok(ev.label.includes('Foden'));
});

test('buildEventsByPlayer groups and sorts by minute', () => {
  const events = [
    { type: 'Card', detail: 'Yellow Card', time: { elapsed: 80 }, player: { id: 5 } },
    { type: 'Goal', detail: 'Normal Goal', time: { elapsed: 12 }, player: { id: 5 } },
    { type: 'Goal', detail: 'Normal Goal', time: { elapsed: 44 }, player: { id: 8 } },
  ];
  const map = buildEventsByPlayer(events);
  assert.equal(map['5'].length, 2);
  assert.equal(map['5'][0].minute, 12);
  assert.equal(map['5'][1].minute, 80);
  assert.equal(map['8'].length, 1);
});

test('buildPlayerEventKey is stable', () => {
  const raw = {
    type: 'Card',
    detail: 'Yellow Card',
    time: { elapsed: 30, extra: 0 },
    player: { id: 12 },
  };
  const key = buildPlayerEventKey(raw, 'card_yellow');
  assert.equal(key, buildPlayerEventKey(raw, 'card_yellow'));
});

test('extractPlayerPitchEvents ignores events without player id', () => {
  const list = extractPlayerPitchEvents([
    { type: 'Var', detail: 'Goal cancelled', time: { elapsed: 70 } },
    { type: 'Goal', detail: 'Normal Goal', time: { elapsed: 10 }, player: { id: 1 } },
  ]);
  assert.equal(list.length, 1);
});

test('getEventAnimationClass maps kinds to CSS classes', () => {
  assert.equal(getEventAnimationClass('goal'), 'event-pulse-goal');
  assert.equal(getEventAnimationClass('card_yellow'), 'event-flash-yellow');
  assert.equal(getEventAnimationClass('var'), 'event-var-blink');
  assert.equal(getEventAnimationClass('penalty_missed'), 'event-penalty-red');
});

test('buildLiveEventToastMessage formats notification text', () => {
  const msg = buildLiveEventToastMessage({
    kind: 'goal',
    label: 'Gol',
    playerName: 'Bruno Fernandes',
    minuteLabel: '67',
  });
  assert.ok(msg.includes('Bruno Fernandes'));
  assert.ok(msg.includes('67'));
  assert.ok(msg.includes('Gol'));
});

test('getTimelineEventKind includes substitutions', () => {
  assert.equal(getTimelineEventKind({ type: 'subst' }), 'subst');
  assert.equal(getTimelineEventKind({ type: 'Goal', detail: 'Normal Goal' }), 'goal');
});

test('buildTimelineFromEvents sorts by minute and extra', () => {
  const events = [
    { type: 'Card', detail: 'Yellow Card', time: { elapsed: 80 }, team: { id: 1 }, player: { id: 5, name: 'A' } },
    { type: 'Goal', detail: 'Normal Goal', time: { elapsed: 12 }, team: { id: 1 }, player: { id: 1, name: 'B' } },
    { type: 'Goal', detail: 'Normal Goal', time: { elapsed: 90, extra: 2 }, team: { id: 2 }, player: { id: 2, name: 'C' } },
  ];
  const timeline = buildTimelineFromEvents(events, { id: 1, name: 'Home' }, { id: 2, name: 'Away' });
  assert.equal(timeline[0].minute, 12);
  assert.equal(timeline[1].minute, 80);
  assert.equal(timeline[2].minute, 90);
  assert.equal(timeline[2].extra, 2);
});

test('buildTimelineEventId is stable', () => {
  const raw = {
    type: 'Goal',
    detail: 'Normal Goal',
    time: { elapsed: 45 },
    team: { id: 1 },
    player: { id: 9, name: 'Striker' },
  };
  const id = buildTimelineEventId(raw, 'goal');
  assert.equal(id, buildTimelineEventId(raw, 'goal'));
});

test('isImportantTimelineKind flags key events', () => {
  assert.equal(isImportantTimelineKind('goal'), true);
  assert.equal(isImportantTimelineKind('card_yellow'), false);
});

test('getTimelineMaxMinute defaults to 90 minimum', () => {
  assert.equal(getTimelineMaxMinute([{ sortMinute: 45 }]), 90);
  assert.equal(getTimelineMaxMinute([{ sortMinute: 102 }]), 102);
});
