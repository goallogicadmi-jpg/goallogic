/**
 * Valida alineaciones reales contra la API de producción.
 * Uso: node scripts/validate-lineups.mjs [fixtureId ...]
 * Sin IDs usa una lista de partidos recientes conocidos.
 */
import {
  assignPositionsFromGrid,
  extractLineupsResponse,
  normalizeLineupFromApi,
  spreadOverlappingPlayers,
} from '../frontend/src/utils/matchLineups.js';

const API_BASE = (process.env.API_URL || 'https://goallogic.onrender.com').replace(/\/$/, '');

const DEFAULT_FIXTURES = [
  1208021, // UCL sample
  1035037,
  977705,
  999999999, // vacío esperado
];

function minPairDistance(starters) {
  let min = Infinity;
  for (let i = 0; i < starters.length; i += 1) {
    for (let j = i + 1; j < starters.length; j += 1) {
      const d = Math.hypot(
        starters[j].pitchX - starters[i].pitchX,
        starters[j].pitchY - starters[i].pitchY
      );
      if (d < min) min = d;
    }
  }
  return min;
}

async function fetchLineups(fixtureId) {
  const res = await fetch(`${API_BASE}/api/fixtures/${fixtureId}/lineups`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

function analyzeTeam(team, label) {
  if (!team) return { label, ok: true, note: 'sin datos' };

  const withGrid = team.starters.filter((p) => p.grid).length;
  const minDist = minPairDistance(team.starters);

  return {
    label,
    formation: team.formation,
    starters: team.starters.length,
    subs: team.substitutes.length,
    withGrid,
    coach: team.coach?.name || '—',
    colors: team.colors?.primary,
    minDist: Number.isFinite(minDist) ? minDist.toFixed(1) : '—',
    overlapRisk: minDist < 5,
  };
}

async function validateFixture(fixtureId) {
  console.log(`\n--- Fixture ${fixtureId} ---`);
  try {
    const payload = await fetchLineups(fixtureId);
    const raw = extractLineupsResponse(payload);

    if (raw.length === 0) {
      console.log('OK vacío: sin alineaciones (estado esperado en partidos sin datos)');
      return { fixtureId, empty: true };
    }

    raw.forEach((lineup, idx) => {
      const team = normalizeLineupFromApi(lineup, {
        id: lineup.team?.id,
        name: lineup.team?.name,
      });
      const report = analyzeTeam(team, lineup.team?.name || `team-${idx}`);
      console.log(report);

      if (report.overlapRisk) {
        console.warn(`⚠ Posible solapamiento en ${report.label} (min dist ${report.minDist}%)`);
      }
    });

    return { fixtureId, empty: false, teams: raw.length };
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return { fixtureId, error: err.message };
  }
}

const ids = process.argv.slice(2).map(Number).filter(Boolean);
const fixtures = ids.length > 0 ? ids : DEFAULT_FIXTURES;

console.log(`API: ${API_BASE}`);
console.log(`Fixtures a validar: ${fixtures.join(', ')}`);

const summary = [];
for (const id of fixtures) {
  summary.push(await validateFixture(id));
}

console.log('\n=== Resumen ===');
console.table(summary);
