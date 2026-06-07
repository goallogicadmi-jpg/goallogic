import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dedupeRawFixtures,
  getSupplementarySelectionLeagueIds,
  isInternationalFriendlyFixture,
  isWorldCupRelatedFriendly,
  resolveCompetitionForScopedFixture,
} from '../utils/internationalFriendlyFixtures.js';

test('getSupplementarySelectionLeagueIds includes friendlies and world cup for selection/all', () => {
  assert.deepEqual(getSupplementarySelectionLeagueIds('selection'), [10, 1]);
  assert.deepEqual(getSupplementarySelectionLeagueIds('all'), [10, 1]);
  assert.deepEqual(getSupplementarySelectionLeagueIds('club'), []);
});

test('isInternationalFriendlyFixture detects API league id 10', () => {
  const fx = { league: { id: 10, name: 'Friendlies', type: 'Friendly' } };
  assert.equal(isInternationalFriendlyFixture(fx), true);
});

test('isWorldCupRelatedFriendly detects FIFA world cup friendly rounds', () => {
  const fx = {
    league: {
      id: 10,
      name: 'Friendlies',
      type: 'Friendly',
      round: 'World Cup - Friendly',
    },
  };
  assert.equal(isWorldCupRelatedFriendly(fx), true);
  assert.equal(isInternationalFriendlyFixture(fx), true);
});

test('resolveCompetitionForScopedFixture includes friendlies for selection scope', () => {
  const lookup = new Map();
  const fx = {
    league: { id: 10, name: 'Friendlies', type: 'Friendly', country: 'World' },
  };
  const meta = resolveCompetitionForScopedFixture(fx, lookup, 'selection');
  assert.ok(meta);
  assert.equal(meta.domain, 'selection');
});

test('resolveCompetitionForScopedFixture excludes friendlies for club scope', () => {
  const lookup = new Map();
  const fx = {
    league: { id: 10, name: 'Friendlies', type: 'Friendly', country: 'World' },
  };
  assert.equal(resolveCompetitionForScopedFixture(fx, lookup, 'club'), null);
});

test('dedupeRawFixtures keeps one entry per fixture id', () => {
  const merged = dedupeRawFixtures([
    { fixture: { id: 1 }, league: { id: 10 } },
    { fixture: { id: 1 }, league: { id: 10 } },
    { fixture: { id: 2 }, league: { id: 1 } },
  ]);
  assert.equal(merged.length, 2);
});
