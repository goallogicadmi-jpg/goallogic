const assert = require('assert');
const {
  mapApiPlayerToSquadProfile,
  evaluateInjuredPlayer,
  enrichTeamInjuries,
  IMPACTO_NIVEL,
  computeInjuryFactorFromEvaluations,
  selectInjuriesByImpactPriority,
} = require('../frontend/src/utils/evaluateInjuryImpact.js');

function testMapPlayer() {
  const profile = mapApiPlayerToSquadProfile({
    player: { id: 1, name: 'Star Forward' },
    statistics: [
      {
        games: { appearences: 20, lineups: 18, minutes: 1600, rating: '7.6', position: 'Attacker' },
        goals: { total: 15, assists: 8 },
        tackles: { total: 5 },
        interceptions: { total: 2 },
      },
    ],
  });
  assert.strictEqual(profile.goles, 15);
  assert.strictEqual(profile.grupoPosicion, 'FWD');
  assert.ok(profile.ratioTitular > 0.8);
}

function testHighImpactInjury() {
  const squad = [
    mapApiPlayerToSquadProfile({
      player: { id: 10, name: 'Key Striker' },
      statistics: [
        {
          games: { appearences: 22, lineups: 20, minutes: 1800, rating: '7.8', position: 'Attacker' },
          goals: { total: 18, assists: 4 },
          tackles: { total: 2 },
        },
      ],
    }),
    mapApiPlayerToSquadProfile({
      player: { id: 11, name: 'Backup Striker' },
      statistics: [
        {
          games: { appearences: 8, lineups: 2, minutes: 200, rating: '6.5', position: 'Attacker' },
          goals: { total: 1, assists: 0 },
          tackles: { total: 1 },
        },
      ],
    }),
  ].filter(Boolean);

  const injury = { player: { id: 10, name: 'Key Striker', type: 'Missing Fixture', reason: 'Knee' } };
  const names = new Set(['key striker']);
  const result = evaluateInjuredPlayer(injury, squad, names);
  assert.ok([IMPACTO_NIVEL.ALTO, IMPACTO_NIVEL.MODERADO].includes(result.impacto));
  assert.ok(result.puntuacionImpacto >= 38);
}

function testEnrichEmpty() {
  const enriched = enrichTeamInjuries({ response: [] }, { response: [] });
  assert.strictEqual(enriched.total, 0);
  assert.strictEqual(enriched.resumenImpacto.factor, 1);
}

function testFactorPenalty() {
  const factor = computeInjuryFactorFromEvaluations([
    { impacto: IMPACTO_NIVEL.ALTO, estado: 'baja' },
    { impacto: IMPACTO_NIVEL.MODERADO, estado: 'baja' },
  ]);
  assert.ok(factor < 1);
  assert.ok(factor >= 0.45);
}

function testSelectByPriority() {
  const jugadores = [
    { jugador: 'B1', impacto: IMPACTO_NIVEL.BAJO, puntuacionImpacto: 90 },
    { jugador: 'A2', impacto: IMPACTO_NIVEL.ALTO, puntuacionImpacto: 50 },
    { jugador: 'M1', impacto: IMPACTO_NIVEL.MODERADO, puntuacionImpacto: 80 },
    { jugador: 'A1', impacto: IMPACTO_NIVEL.ALTO, puntuacionImpacto: 95 },
    { jugador: 'M2', impacto: IMPACTO_NIVEL.MODERADO, puntuacionImpacto: 40 },
    { jugador: 'B2', impacto: IMPACTO_NIVEL.BAJO, puntuacionImpacto: 10 },
  ];
  const picked = selectInjuriesByImpactPriority(jugadores, 5);
  assert.strictEqual(picked.length, 5);
  assert.strictEqual(picked[0].jugador, 'A1');
  assert.strictEqual(picked[1].jugador, 'A2');
  assert.strictEqual(picked[2].jugador, 'M1');
  assert.strictEqual(picked[3].jugador, 'M2');
  assert.strictEqual(picked[4].jugador, 'B1');
}

testMapPlayer();
testHighImpactInjury();
testEnrichEmpty();
testFactorPenalty();
testSelectByPriority();
console.log('✅ evaluateInjuryImpact tests passed');
