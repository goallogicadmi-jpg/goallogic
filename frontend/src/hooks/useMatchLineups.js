import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFixtureLineups } from '../api/api';
import {
  extractLineupsResponse,
  getMockMatchLineups,
  normalizeLineupFromApi,
  pairLineupsWithFixture,
} from '../utils/matchLineups';

/**
 * Carga y normaliza alineaciones desde GET /api/fixtures/:id/lineups
 *
 * @param {number|string|null} fixtureId
 * @param {Object|null} partido
 * @param {{ enabled?: boolean, useMock?: boolean }} [options]
 */
export function useMatchLineups(fixtureId, partido, options = {}) {
  const { enabled = true, useMock = false } = options;

  const [loading, setLoading] = useState(Boolean(enabled && !useMock && fixtureId));
  const [error, setError] = useState(null);
  const [raw, setRaw] = useState(null);
  const [tick, setTick] = useState(0);

  const homeMeta = useMemo(
    () => ({
      id: partido?.teams?.home?.id,
      name: partido?.teams?.home?.name,
      logo: partido?.teams?.home?.logo,
    }),
    [partido?.teams?.home]
  );

  const awayMeta = useMemo(
    () => ({
      id: partido?.teams?.away?.id,
      name: partido?.teams?.away?.name,
      logo: partido?.teams?.away?.logo,
    }),
    [partido?.teams?.away]
  );

  const refetch = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    if (useMock) {
      setRaw(null);
      setError(null);
      setLoading(false);
      return undefined;
    }

    if (!fixtureId) {
      setRaw(null);
      setError(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const payload = await getFixtureLineups(fixtureId);
        if (cancelled) return;

        const list = extractLineupsResponse(payload);
        setRaw(list);
      } catch (err) {
        if (cancelled) return;
        console.error('[useMatchLineups]', err);
        setError('No se pudieron cargar las alineaciones.');
        setRaw([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [enabled, fixtureId, useMock, tick]);

  const { home, away, hasLineups } = useMemo(() => {
    if (useMock) {
      const mock = getMockMatchLineups();
      return {
        home: {
          ...mock.home,
          name: homeMeta.name || mock.home.name,
          logo: homeMeta.logo ?? mock.home.logo,
          teamId: homeMeta.id ?? mock.home.teamId,
        },
        away: {
          ...mock.away,
          name: awayMeta.name || mock.away.name,
          logo: awayMeta.logo ?? mock.away.logo,
          teamId: awayMeta.id ?? mock.away.teamId,
        },
        hasLineups: true,
      };
    }

    if (!raw || raw.length === 0) {
      return { home: null, away: null, hasLineups: false };
    }

    const { homeRaw, awayRaw } = pairLineupsWithFixture(raw, homeMeta, awayMeta);

    const homeTeam = homeRaw
      ? normalizeLineupFromApi(homeRaw, homeMeta)
      : null;
    const awayTeam = awayRaw
      ? normalizeLineupFromApi(awayRaw, awayMeta)
      : null;

    return {
      home: homeTeam,
      away: awayTeam,
      hasLineups: Boolean(
        (homeTeam?.starters?.length || 0) > 0 ||
        (awayTeam?.starters?.length || 0) > 0
      ),
    };
  }, [raw, useMock, homeMeta, awayMeta]);

  return {
    loading,
    error,
    home,
    away,
    raw,
    hasLineups,
    refetch,
  };
}

export default useMatchLineups;
