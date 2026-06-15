const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildSeasonFallbackChain,
  avgGoalsFromUltimosPartidos,
  resolveXgMetrics,
  resolveCatalogSeasonFallback,
} = require('../utils/predictionSeasonUtils');

test('buildSeasonFallbackChain includes 2022 for World Cup 2026', () => {
  const chain = buildSeasonFallbackChain(1, 2026);
  assert.deepEqual(chain, [2026, 2022, 2025]);
});

test('avgGoalsFromUltimosPartidos computes averages', () => {
  const avg = avgGoalsFromUltimosPartidos([
    { golesFavor: 2, golesContra: 1 },
    { golesFavor: 0, golesContra: 0 },
  ]);
  assert.equal(avg.games, 2);
  assert.equal(avg.forAvg, 1);
  assert.equal(avg.againstAvg, 0.5);
});

test('resolveXgMetrics estimates when API xG missing', () => {
  const result = resolveXgMetrics({
    xGFromFixtures: null,
    xGAFromFixtures: null,
    promedioGolesFavor: 2,
    promedioGolesContra: 1,
    ultimosPartidos: [],
  });
  assert.equal(result.xGSource, 'estimated');
  assert.equal(result.xG, 2.1);
  assert.equal(result.xGASource, 'estimated');
  assert.equal(result.xGA, 1.05);
});

test('resolveCatalogSeasonFallback uses calendar year', () => {
  const season = resolveCatalogSeasonFallback(9, () => ({ seasonMode: 'calendar_year' }));
  assert.equal(season, new Date().getFullYear());
});
