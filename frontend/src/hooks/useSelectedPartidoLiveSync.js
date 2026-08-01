import { useEffect, useRef } from 'react';
import { getFixtureById } from '../api/api';
import {
  getLiveFixturePollDelayMs,
  hasFixtureLiveSnapshotChanged,
  mergeFixtureLiveUpdate,
  shouldPollFixtureLiveMinute,
} from '../utils/matchEvents';

/**
 * Mantiene actualizado el partido seleccionado en MatchCenter (marcador/estado en vivo).
 *
 * @param {Object|null} selectedPartido
 * @param {(updater: Object | ((prev: Object) => Object)) => void} setSelectedPartido
 */
export function useSelectedPartidoLiveSync(selectedPartido, setSelectedPartido) {
  const selectedRef = useRef(selectedPartido);
  selectedRef.current = selectedPartido;

  const fixtureId = selectedPartido?.fixture?.id;
  const shouldSync = Boolean(fixtureId) && shouldPollFixtureLiveMinute(selectedPartido);

  useEffect(() => {
    if (!shouldSync || !fixtureId) {
      return undefined;
    }

    let cancelled = false;
    let timeoutId = null;

    const poll = async () => {
      try {
        const fresh = await getFixtureById(fixtureId);
        if (cancelled || !fresh) return;

        setSelectedPartido((current) => {
          if (!current || current.fixture?.id !== fixtureId) {
            return current;
          }

          const merged = mergeFixtureLiveUpdate(current, fresh);
          return hasFixtureLiveSnapshotChanged(current, merged) ? merged : current;
        });
      } catch (error) {
        console.error('[useSelectedPartidoLiveSync]', error);
      } finally {
        if (!cancelled) {
          timeoutId = window.setTimeout(poll, getLiveFixturePollDelayMs());
        }
      }
    };

    timeoutId = window.setTimeout(poll, getLiveFixturePollDelayMs());

    return () => {
      cancelled = true;
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [fixtureId, shouldSync, setSelectedPartido]);
}

export default useSelectedPartidoLiveSync;
