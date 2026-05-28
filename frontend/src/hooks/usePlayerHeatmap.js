import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFixturePlayerHeatmap } from '../api/api';

/** @type {Map<string, { data: object, ts: number }>} */
const heatmapCache = new Map();

const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(fixtureId, playerId) {
  return `heatmap-${fixtureId}-${playerId}`;
}

function getCached(key) {
  const entry = heatmapCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    heatmapCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  heatmapCache.set(key, { data, ts: Date.now() });
}

/**
 * @param {Object|Array|null} payload
 */
function extractHeatmapResponse(payload) {
  const block = payload?.response ?? payload;
  if (!block) return { points: [], source: null };
  const points = Array.isArray(block.points) ? block.points : [];
  return {
    points,
    source: block.source ?? null,
    meta: block.meta ?? null,
  };
}

/**
 * @param {number|string|null} fixtureId
 * @param {number|string|null} playerId
 * @param {{ enabled?: boolean }} [options]
 */
export function usePlayerHeatmap(fixtureId, playerId, options = {}) {
  const { enabled = true } = options;

  const [loading, setLoading] = useState(Boolean(enabled && fixtureId && playerId));
  const [error, setError] = useState(null);
  const [points, setPoints] = useState([]);
  const [source, setSource] = useState(null);

  const hasData = useMemo(() => points.length > 0, [points]);

  const refetch = useCallback(async () => {
    if (!enabled || !fixtureId || !playerId) return;

    const key = cacheKey(fixtureId, playerId);
    heatmapCache.delete(key);

    setLoading(true);
    setError(null);

    try {
      const payload = await getFixturePlayerHeatmap(fixtureId, playerId);
      const parsed = extractHeatmapResponse(payload);
      setCached(key, parsed);
      setPoints(parsed.points);
      setSource(parsed.source);
    } catch (err) {
      console.error('[usePlayerHeatmap]', err);
      setError('No se pudo cargar el mapa de calor.');
      setPoints([]);
      setSource(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, fixtureId, playerId]);

  useEffect(() => {
    if (!enabled || !fixtureId || !playerId) {
      setLoading(false);
      setPoints([]);
      setError(null);
      setSource(null);
      return;
    }

    const key = cacheKey(fixtureId, playerId);
    const cached = getCached(key);
    if (cached) {
      setPoints(cached.points);
      setSource(cached.source);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const payload = await getFixturePlayerHeatmap(fixtureId, playerId);
        if (cancelled) return;

        const parsed = extractHeatmapResponse(payload);
        setCached(key, parsed);
        setPoints(parsed.points);
        setSource(parsed.source);
      } catch (err) {
        if (cancelled) return;
        console.error('[usePlayerHeatmap]', err);
        setError('No se pudo cargar el mapa de calor.');
        setPoints([]);
        setSource(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [enabled, fixtureId, playerId]);

  return {
    loading,
    error,
    points,
    source,
    hasData,
    refetch,
  };
}

export default usePlayerHeatmap;
