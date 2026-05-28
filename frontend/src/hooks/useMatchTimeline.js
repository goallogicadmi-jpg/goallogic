import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFixtureEvents } from '../api/api';
import {
  buildTimelineFromEvents,
  extractEventsResponse,
  isFixtureFinished,
  isFixtureLive,
} from '../utils/matchEvents';

const DEFAULT_POLL_MS = 35000;

/**
 * Timeline cronológico del partido con polling en vivo.
 *
 * @param {number|string|null} fixtureId
 * @param {Object|null} partido
 * @param {{ enabled?: boolean, pollIntervalMs?: number }} [options]
 */
export function useMatchTimeline(fixtureId, partido, options = {}) {
  const { enabled = true, pollIntervalMs = DEFAULT_POLL_MS } = options;

  const [loading, setLoading] = useState(Boolean(enabled && fixtureId));
  const [error, setError] = useState(null);
  const [rawEvents, setRawEvents] = useState([]);
  const knownIdsRef = useRef(new Set());
  const [newTimelineIds, setNewTimelineIds] = useState(() => new Set());

  const isLive = useMemo(() => isFixtureLive(partido), [partido]);
  const isFinished = useMemo(() => isFixtureFinished(partido), [partido]);
  const shouldPoll = enabled && Boolean(fixtureId) && isLive && !isFinished;

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

  const teamColors = useMemo(
    () => ({
      homeColor: partido?.teams?.home?.colors?.primary,
      awayColor: partido?.teams?.away?.colors?.primary,
    }),
    [partido?.teams?.home, partido?.teams?.away]
  );

  const timelineEvents = useMemo(
    () => buildTimelineFromEvents(rawEvents, homeMeta, awayMeta, teamColors),
    [rawEvents, homeMeta, awayMeta, teamColors]
  );

  useEffect(() => {
    knownIdsRef.current = new Set();
    setNewTimelineIds(new Set());
  }, [fixtureId]);

  const refetch = useCallback(async () => {
    if (!enabled || !fixtureId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await getFixtureEvents(fixtureId);
      setRawEvents(extractEventsResponse(payload));
    } catch (err) {
      console.error('[useMatchTimeline] refetch', err);
      setError('No se pudieron cargar los eventos del partido.');
      setRawEvents([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, fixtureId]);

  useEffect(() => {
    if (!enabled || !fixtureId) {
      setLoading(false);
      setRawEvents([]);
      return undefined;
    }

    let cancelled = false;

    async function load(isPoll = false) {
      if (!isPoll) {
        setLoading(true);
        setError(null);
      }

      try {
        const payload = await getFixtureEvents(fixtureId);
        if (cancelled) return;

        const list = extractEventsResponse(payload);
        setRawEvents(list);

        const timeline = buildTimelineFromEvents(list, homeMeta, awayMeta, teamColors);
        const freshIds = new Set();

        timeline.forEach((ev) => {
          if (!knownIdsRef.current.has(ev.id)) {
            freshIds.add(ev.id);
          }
          knownIdsRef.current.add(ev.id);
        });

        if (isPoll && freshIds.size > 0) {
          setNewTimelineIds((prev) => {
            const next = new Set(prev);
            freshIds.forEach((id) => next.add(id));
            return next;
          });
        }
      } catch (err) {
        if (cancelled) return;
        console.error('[useMatchTimeline]', err);
        if (!isPoll) {
          setError('No se pudieron cargar los eventos del partido.');
          setRawEvents([]);
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
  }, [enabled, fixtureId, homeMeta, awayMeta, teamColors, shouldPoll, pollIntervalMs]);

  const clearNewTimelineFlag = useCallback((eventId) => {
    setNewTimelineIds((prev) => {
      if (!prev.has(eventId)) return prev;
      const next = new Set(prev);
      next.delete(eventId);
      return next;
    });
  }, []);

  return {
    loading,
    error,
    timelineEvents,
    isLive,
    isFinished,
    shouldPoll,
    newTimelineIds,
    clearNewTimelineFlag,
    refetch,
  };
}

export default useMatchTimeline;
