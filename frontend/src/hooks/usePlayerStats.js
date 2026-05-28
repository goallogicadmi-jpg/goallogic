import { useCallback, useEffect, useState } from 'react';
import { getFixturePlayerStats } from '../api/api';
import {
  buildPlayerStatsViewModel,
  extractFixturePlayerResponse,
} from '../utils/playerFixtureStats';

/** @type {Map<string, { data: object, ts: number }>} */
const statsCache = new Map();

const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(fixtureId, playerId) {
  return `${fixtureId}-${playerId}`;
}

function getCached(key) {
  const entry = statsCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    statsCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  statsCache.set(key, { data, ts: Date.now() });
}

/**
 * Stats de un jugador en el partido actual (fixture).
 *
 * @param {number|string|null} fixtureId
 * @param {number|string|null} playerId
 * @param {{ enabled?: boolean, lineupPlayer?: object|null }} [options]
 */
export function usePlayerStats(fixtureId, playerId, options = {}) {
  const { enabled = true, lineupPlayer = null } = options;

  const [loading, setLoading] = useState(Boolean(enabled && fixtureId && playerId));
  const [error, setError] = useState(null);
  const [viewModel, setViewModel] = useState(null);

  const refetch = useCallback(async () => {
    if (!enabled || !fixtureId || !playerId) return;

    const key = cacheKey(fixtureId, playerId);
    statsCache.delete(key);

    setLoading(true);
    setError(null);

    try {
      const payload = await getFixturePlayerStats(fixtureId, playerId);
      const entry = extractFixturePlayerResponse(payload);
      const model = buildPlayerStatsViewModel(entry, lineupPlayer);
      setCached(key, model);
      setViewModel(model);
    } catch (err) {
      console.error('[usePlayerStats]', err);
      setError('No se pudieron cargar las estadísticas del jugador.');
      setViewModel(buildPlayerStatsViewModel(null, lineupPlayer));
    } finally {
      setLoading(false);
    }
  }, [enabled, fixtureId, playerId, lineupPlayer]);

  useEffect(() => {
    if (!enabled || !fixtureId || !playerId) {
      setLoading(false);
      setViewModel(null);
      setError(null);
      return;
    }

    const key = cacheKey(fixtureId, playerId);
    const cached = getCached(key);
    if (cached) {
      setViewModel(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const payload = await getFixturePlayerStats(fixtureId, playerId);
        if (cancelled) return;

        const entry = extractFixturePlayerResponse(payload);
        const model = buildPlayerStatsViewModel(entry, lineupPlayer);
        setCached(key, model);
        setViewModel(model);
      } catch (err) {
        if (cancelled) return;
        console.error('[usePlayerStats]', err);
        setError('No se pudieron cargar las estadísticas del jugador.');
        setViewModel(buildPlayerStatsViewModel(null, lineupPlayer));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [enabled, fixtureId, playerId, lineupPlayer]);

  return {
    loading,
    error,
    viewModel,
    hasStats: viewModel?.hasStats ?? false,
    player: viewModel?.player ?? lineupPlayer,
    statCards: viewModel?.statCards ?? [],
    team: viewModel?.team ?? null,
    refetch,
  };
}

export default usePlayerStats;
