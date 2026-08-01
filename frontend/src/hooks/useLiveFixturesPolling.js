import { useEffect, useMemo, useRef } from 'react';
import { getFixtureById, getLiveFixtures } from '../api/api';
import {
  applyLiveFixtureUpdates,
  getLiveFixturePollDelayMs,
  shouldPollFixtureLiveMinute,
} from '../utils/matchEvents';

/**
 * Refresca minutos en vivo del listado de partidos sin recargar el feed completo.
 *
 * @param {Array} partidos
 * @param {(updater: Array | ((prev: Array) => Array)) => void} onPartidosChange
 * @param {{ enabled?: boolean }} [options]
 */
export function useLiveFixturesPolling(partidos, onPartidosChange, options = {}) {
  const { enabled = true } = options;

  const partidosRef = useRef(partidos);
  partidosRef.current = partidos;

  const onPartidosChangeRef = useRef(onPartidosChange);
  onPartidosChangeRef.current = onPartidosChange;

  const liveFixtureIdsKey = useMemo(() => {
    if (!enabled || !Array.isArray(partidos)) {
      return '';
    }

    return partidos
      .filter((partido) => shouldPollFixtureLiveMinute(partido))
      .map((partido) => partido.fixture?.id)
      .filter(Boolean)
      .sort((left, right) => left - right)
      .join(',');
  }, [enabled, partidos]);

  useEffect(() => {
    if (!enabled || !liveFixtureIdsKey) {
      return undefined;
    }

    let cancelled = false;
    let timeoutId = null;
    let polling = false;

    const scheduleNextPoll = () => {
      if (cancelled) return;

      const stillLive = partidosRef.current.some((partido) =>
        shouldPollFixtureLiveMinute(partido)
      );

      if (!stillLive) {
        return;
      }

      timeoutId = window.setTimeout(runPoll, getLiveFixturePollDelayMs());
    };

    const runPoll = async () => {
      if (cancelled || polling) {
        scheduleNextPoll();
        return;
      }

      polling = true;

      try {
        const trackedIds = new Set(
          partidosRef.current
            .filter((partido) => shouldPollFixtureLiveMinute(partido))
            .map((partido) => partido.fixture?.id)
            .filter(Boolean)
        );

        if (trackedIds.size === 0) {
          return;
        }

        const liveFixtures = await getLiveFixtures();
        if (cancelled) return;

        const liveById = new Map(
          liveFixtures
            .map((fixture) => [fixture?.fixture?.id, fixture])
            .filter(([fixtureId]) => fixtureId != null)
        );

        const missingLiveIds = [...trackedIds].filter((fixtureId) => !liveById.has(fixtureId));
        const finishedById = new Map();

        if (missingLiveIds.length > 0) {
          const finishedFixtures = await Promise.all(
            missingLiveIds.map(async (fixtureId) => {
              try {
                return await getFixtureById(fixtureId);
              } catch (error) {
                console.error('[useLiveFixturesPolling] fixture final', fixtureId, error);
                return null;
              }
            })
          );

          finishedFixtures.forEach((fixture) => {
            const fixtureId = fixture?.fixture?.id;
            if (fixtureId != null) {
              finishedById.set(fixtureId, fixture);
            }
          });
        }

        onPartidosChangeRef.current((prev) =>
          applyLiveFixtureUpdates(prev, liveById, finishedById)
        );
      } catch (error) {
        console.error('[useLiveFixturesPolling]', error);
      } finally {
        polling = false;
        scheduleNextPoll();
      }
    };

    timeoutId = window.setTimeout(runPoll, getLiveFixturePollDelayMs());

    return () => {
      cancelled = true;
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [enabled, liveFixtureIdsKey]);
}
