import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFixtureTactical } from '../api/api';
import { isFixtureFinished, isFixtureLive } from '../utils/matchEvents';

/** @type {Map<string, { data: object, ts: number }>} */
const tacticalCache = new Map();

const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_POLL_MS = 35000;

function cacheKey(fixtureId, homeTeamId, awayTeamId) {
  return `tactical-${fixtureId}-${homeTeamId}-${awayTeamId}`;
}

function getCached(key) {
  const entry = tacticalCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    tacticalCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  tacticalCache.set(key, { data, ts: Date.now() });
}

/**
 * @param {Object|null} payload
 */
function extractTacticalResponse(payload) {
  const block = payload?.response ?? payload;
  if (!block) return { home: null, away: null };
  return {
    home: block.home || null,
    away: block.away || null,
  };
}

/**
 * @param {number|string|null} fixtureId
 * @param {Object|null} partido
 * @param {{ enabled?: boolean, pollIntervalMs?: number }} [options]
 */
export function useTacticalView(fixtureId, partido, options = {}) {
  const { enabled = true, pollIntervalMs = DEFAULT_POLL_MS } = options;

  const homeTeamId = partido?.teams?.home?.id;
  const awayTeamId = partido?.teams?.away?.id;

  const [loading, setLoading] = useState(Boolean(enabled && fixtureId));
  const [error, setError] = useState(null);
  const [data, setData] = useState({ home: null, away: null });

  const isLive = useMemo(() => isFixtureLive(partido), [partido]);
  const isFinished = useMemo(() => isFixtureFinished(partido), [partido]);
  const shouldPoll = enabled && Boolean(fixtureId) && isLive && !isFinished;

  const refetch = useCallback(async () => {
    if (!enabled || !fixtureId) return;

    const key = cacheKey(fixtureId, homeTeamId, awayTeamId);
    tacticalCache.delete(key);

    setLoading(true);
    setError(null);

    try {
      const payload = await getFixtureTactical(fixtureId, homeTeamId, awayTeamId);
      const parsed = extractTacticalResponse(payload);
      setCached(key, parsed);
      setData(parsed);
    } catch (err) {
      console.error('[useTacticalView] refetch', err);
      setError('No se pudieron cargar los datos tácticos.');
      setData({ home: null, away: null });
    } finally {
      setLoading(false);
    }
  }, [enabled, fixtureId, homeTeamId, awayTeamId]);

  useEffect(() => {
    if (!enabled || !fixtureId) {
      setLoading(false);
      setData({ home: null, away: null });
      return undefined;
    }

    const key = cacheKey(fixtureId, homeTeamId, awayTeamId);
    const cached = getCached(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
      return undefined;
    }

    let cancelled = false;

    async function load(isPoll = false) {
      if (!isPoll) {
        setLoading(true);
        setError(null);
      }

      try {
        const payload = await getFixtureTactical(fixtureId, homeTeamId, awayTeamId);
        if (cancelled) return;

        const parsed = extractTacticalResponse(payload);
        setCached(key, parsed);
        setData(parsed);
      } catch (err) {
        if (cancelled) return;
        console.error('[useTacticalView]', err);
        if (!isPoll) {
          setError('No se pudieron cargar los datos tácticos.');
          setData({ home: null, away: null });
        }
      } finally {
        if (!cancelled && !isPoll) setLoading(false);
      }
    }

    load(false);

    if (!shouldPoll) {
      return () => {
        cancelled = true;
      };
    }

    const intervalId = setInterval(() => load(true), pollIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [enabled, fixtureId, homeTeamId, awayTeamId, shouldPoll, pollIntervalMs]);

  return {
    loading,
    error,
    home: data.home,
    away: data.away,
    isLive,
    isFinished,
    shouldPoll,
    refetch,
  };
}

export default useTacticalView;
