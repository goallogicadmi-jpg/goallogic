const DEFAULT_TTL_MS = 20 * 60 * 1000;

const teamFixturesCache = new Map();
const fixtureStatsCache = new Map();
const metricsTraceHistory = new Map();

function now() {
  return Date.now();
}

function isFresh(entry, ttlMs = DEFAULT_TTL_MS) {
  if (!entry) {
    return false;
  }
  return now() - entry.ts < ttlMs;
}

export function getCachedTeamFixtures(teamId, limit) {
  const key = `${normalizeKey(teamId)}:${limit}`;
  const entry = teamFixturesCache.get(key);
  return isFresh(entry) ? entry.data : null;
}

export function setCachedTeamFixtures(teamId, limit, data) {
  const key = `${normalizeKey(teamId)}:${limit}`;
  teamFixturesCache.set(key, { data, ts: now() });
}

export function getCachedFixtureStats(fixtureId) {
  const key = normalizeKey(fixtureId);
  const entry = fixtureStatsCache.get(key);
  return isFresh(entry) ? entry.data : null;
}

export function setCachedFixtureStats(fixtureId, data) {
  const key = normalizeKey(fixtureId);
  fixtureStatsCache.set(key, { data, ts: now() });
}

function normalizeKey(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : String(value);
}

export function isPrediccionesMetricsDebugEnabled() {
  if (typeof window === 'undefined') {
    return import.meta.env.DEV;
  }
  try {
    return import.meta.env.DEV || window.localStorage.getItem('predicciones_debug_metricas') === '1';
  } catch {
    return import.meta.env.DEV;
  }
}

export function fingerprintFixturesList(fixtures) {
  if (!Array.isArray(fixtures)) {
    return '';
  }
  return fixtures
    .map((fixture) => {
      const id = fixture?.fixture?.id ?? '';
      const status = fixture?.fixture?.status?.short ?? '';
      const ts = fixture?.fixture?.timestamp ?? '';
      return `${id}:${status}:${ts}`;
    })
    .join('|');
}

export function recordMetricsTrace(pairKey, trace) {
  const previous = metricsTraceHistory.get(pairKey);
  metricsTraceHistory.set(pairKey, { ...trace, ts: now() });

  if (!isPrediccionesMetricsDebugEnabled()) {
    return previous ?? null;
  }

  if (previous) {
    logMetricsDiff(pairKey, previous, trace);
  } else {
    console.groupCollapsed(`[Predicciones métricas] Trace inicial — ${pairKey}`);
    console.log(trace);
    console.groupEnd();
  }

  return previous ?? null;
}

function logMetricsDiff(pairKey, previous, current) {
  const diffs = [];

  compareTeamTrace('A', previous.teamA, current.teamA, diffs);
  compareTeamTrace('B', previous.teamB, current.teamB, diffs);

  if (previous.cornersEsperados?.total !== current.cornersEsperados?.total) {
    diffs.push({
      field: 'cornersEsperados.total',
      before: previous.cornersEsperados?.total,
      after: current.cornersEsperados?.total,
    });
  }

  if (previous.tarjetasEsperadas?.total !== current.tarjetasEsperadas?.total) {
    diffs.push({
      field: 'tarjetasEsperadas.total',
      before: previous.tarjetasEsperadas?.total,
      after: current.tarjetasEsperadas?.total,
    });
  }

  if (diffs.length === 0) {
    console.info(`[Predicciones métricas] Sin cambios entre análisis — ${pairKey}`);
    return;
  }

  console.group(`[Predicciones métricas] Variación detectada — ${pairKey}`);
  console.table(diffs);
  console.log('Trace anterior:', previous);
  console.log('Trace actual:', current);
  console.groupEnd();
}

function compareTeamTrace(label, before, after, diffs) {
  if (!before || !after) {
    return;
  }

  if (before.fixtureFingerprint !== after.fixtureFingerprint) {
    diffs.push({
      field: `team${label}.fixtureFingerprint`,
      before: before.fixtureFingerprint,
      after: after.fixtureFingerprint,
    });
  }

  const beforeIds = (before.selectedFixtures || []).map((item) => item.fixtureId).join(',');
  const afterIds = (after.selectedFixtures || []).map((item) => item.fixtureId).join(',');

  if (beforeIds !== afterIds) {
    diffs.push({
      field: `team${label}.selectedFixtures`,
      before: beforeIds,
      after: afterIds,
    });
  }

  const beforeMap = new Map(
    (before.selectedFixtures || []).map((item) => [String(item.fixtureId), item])
  );

  for (const sample of after.selectedFixtures || []) {
    const prev = beforeMap.get(String(sample.fixtureId));
    if (!prev) {
      continue;
    }

    ['cornersFor', 'cornersAgainst', 'cardsFor', 'cardsAgainst'].forEach((metric) => {
      if (prev[metric] !== sample[metric]) {
        diffs.push({
          field: `team${label}.fixture.${sample.fixtureId}.${metric}`,
          before: prev[metric],
          after: sample[metric],
        });
      }
    });
  }
}

export function buildPairMetricsKey(teamAId, teamBId) {
  return [normalizeKey(teamAId), normalizeKey(teamBId)].sort().join(':');
}

export function clearPrediccionesMetricsCache() {
  teamFixturesCache.clear();
  fixtureStatsCache.clear();
  metricsTraceHistory.clear();
}
