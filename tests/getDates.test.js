import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterFixturesByLocalDay,
  getLocalDayRange,
  getUtcDatesToFetchForLocalDay,
  toLocalDateString,
  toUtcDateString,
} from '../frontend/src/utils/getDates.js';

test('getUtcDatesToFetchForLocalDay returns one or two UTC dates', () => {
  const dates = getUtcDatesToFetchForLocalDay('2026-05-27');
  assert.ok(dates.length >= 1);
  assert.ok(dates.length <= 3);
  assert.ok(dates.includes('2026-05-27') || dates.includes('2026-05-28'));
});

test('filterFixturesByLocalDay keeps only kickoffs in local range', () => {
  const { start } = getLocalDayRange('2026-05-27');
  const kickoffInDay = new Date(start.getTime() + 12 * 60 * 60 * 1000).toISOString();

  const prevDay = new Date(start.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const nextDay = new Date(start.getTime() + 26 * 60 * 60 * 1000).toISOString();

  const fixtures = [
    { fixture: { id: 1, date: kickoffInDay, status: { short: 'NS' } } },
    { fixture: { id: 2, date: prevDay, status: { short: 'FT' } } },
    { fixture: { id: 3, date: nextDay, status: { short: 'NS' } } },
  ];

  const filtered = filterFixturesByLocalDay(fixtures, '2026-05-27');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].fixture.id, 1);
});

test('toUtcDateString uses UTC calendar', () => {
  const d = new Date('2026-05-27T23:30:00.000Z');
  assert.equal(toUtcDateString(d), '2026-05-27');
});
