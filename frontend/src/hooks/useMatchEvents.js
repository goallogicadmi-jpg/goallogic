import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFixtureEvents } from '../api/api';
import {
  buildEventsByPlayer,
  buildLiveEventToastMessage,
  extractEventsResponse,
  extractPlayerPitchEvents,
  isFixtureFinished,
  isFixtureLive,
  pairSubstitutionsWithFixture,
} from '../utils/matchEvents';

const DEFAULT_POLL_MS = 35000;
const ANIMATION_DURATION_MS = 2500;
const TOAST_DURATION_MS = 4500;
const MAX_LIVE_TOASTS = 3;

/**
 * Eventos del partido (sustituciones) con refresh en vivo.
 *
 * @param {number|string|null} fixtureId
 * @param {Object|null} partido
 * @param {{ enabled?: boolean, pollIntervalMs?: number }} [options]
 */
export function useMatchEvents(fixtureId, partido, options = {}) {
  const { enabled = true, pollIntervalMs = DEFAULT_POLL_MS } = options;

  const [loading, setLoading] = useState(Boolean(enabled && fixtureId));
  const [error, setError] = useState(null);
  const [rawEvents, setRawEvents] = useState([]);
  const knownSubIdsRef = useRef(new Set());
  const knownPlayerEventIdsRef = useRef(new Set());
  const [newSubstitutionIds, setNewSubstitutionIds] = useState(() => new Set());
  const [newPlayerEventIds, setNewPlayerEventIds] = useState(() => new Set());
  const [animateEventByPlayer, setAnimateEventByPlayer] = useState({});
  const [liveEventToasts, setLiveEventToasts] = useState([]);

  const animationTimersRef = useRef(new Map());
  const toastTimersRef = useRef(new Map());
  const isFinishedRef = useRef(false);

  const isLive = useMemo(() => isFixtureLive(partido), [partido]);
  const isFinished = useMemo(() => isFixtureFinished(partido), [partido]);
  const shouldPoll = enabled && Boolean(fixtureId) && isLive && !isFinished;

  useEffect(() => {
    isFinishedRef.current = isFinished;
  }, [isFinished]);

  const clearAnimationTimer = useCallback((key) => {
    const timer = animationTimersRef.current.get(key);
    if (timer) {
      clearTimeout(timer);
      animationTimersRef.current.delete(key);
    }
  }, []);

  const clearToastTimer = useCallback((toastId) => {
    const timer = toastTimersRef.current.get(toastId);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(toastId);
    }
  }, []);

  const triggerLivePlayerAnimations = useCallback(
    (freshEvents) => {
      if (!freshEvents.length || isFinishedRef.current) return;

      const latestByPlayer = {};
      freshEvents.forEach((ev) => {
        const key = String(ev.playerId);
        const prev = latestByPlayer[key];
        if (!prev || ev.sortMinute >= prev.sortMinute) {
          latestByPlayer[key] = ev;
        }
      });

      const animationUpdates = {};

      Object.values(latestByPlayer).forEach((ev) => {
        const playerKey = String(ev.playerId);
        animationUpdates[playerKey] = { kind: ev.kind, eventId: ev.id };

        const timerKey = `${playerKey}-${ev.id}`;
        clearAnimationTimer(timerKey);

        const timer = setTimeout(() => {
          setAnimateEventByPlayer((prev) => {
            const current = prev[playerKey];
            if (!current || current.eventId !== ev.id) return prev;
            const next = { ...prev };
            delete next[playerKey];
            return next;
          });
          animationTimersRef.current.delete(timerKey);
        }, ANIMATION_DURATION_MS);

        animationTimersRef.current.set(timerKey, timer);
      });

      if (Object.keys(animationUpdates).length > 0) {
        setAnimateEventByPlayer((prev) => ({ ...prev, ...animationUpdates }));
      }

      const toastEntries = freshEvents.map((ev) => ({
        id: `toast-${ev.id}`,
        message: buildLiveEventToastMessage(ev),
      }));

      if (toastEntries.length > 0) {
        setLiveEventToasts((prev) => {
          const merged = [...prev, ...toastEntries];
          return merged.slice(-MAX_LIVE_TOASTS);
        });

        toastEntries.forEach((toast) => {
          clearToastTimer(toast.id);
          const timer = setTimeout(() => {
            setLiveEventToasts((prev) => prev.filter((t) => t.id !== toast.id));
            toastTimersRef.current.delete(toast.id);
          }, TOAST_DURATION_MS);
          toastTimersRef.current.set(toast.id, timer);
        });
      }
    },
    [clearAnimationTimer, clearToastTimer]
  );

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

  const refetch = useCallback(async () => {
    if (!enabled || !fixtureId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await getFixtureEvents(fixtureId);
      const list = extractEventsResponse(payload);
      setRawEvents(list);
    } catch (err) {
      console.error('[useMatchEvents] refetch', err);
      setError('No se pudieron cargar los cambios del partido.');
    } finally {
      setLoading(false);
    }
  }, [enabled, fixtureId]);

  useEffect(() => {
    knownSubIdsRef.current = new Set();
    knownPlayerEventIdsRef.current = new Set();
    setNewSubstitutionIds(new Set());
    setNewPlayerEventIds(new Set());
    setAnimateEventByPlayer({});
    setLiveEventToasts([]);

    animationTimersRef.current.forEach((timer) => clearTimeout(timer));
    animationTimersRef.current.clear();
    toastTimersRef.current.forEach((timer) => clearTimeout(timer));
    toastTimersRef.current.clear();
  }, [fixtureId]);

  useEffect(() => {
    return () => {
      animationTimersRef.current.forEach((timer) => clearTimeout(timer));
      animationTimersRef.current.clear();
      toastTimersRef.current.forEach((timer) => clearTimeout(timer));
      toastTimersRef.current.clear();
    };
  }, []);

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

        const { substitutionsHome, substitutionsAway } = pairSubstitutionsWithFixture(
          list,
          homeMeta,
          awayMeta
        );
        const allSubs = [...substitutionsHome, ...substitutionsAway];
        const freshIds = new Set();

        allSubs.forEach((sub) => {
          if (!knownSubIdsRef.current.has(sub.id)) {
            freshIds.add(sub.id);
          }
          knownSubIdsRef.current.add(sub.id);
        });

        if (isPoll && freshIds.size > 0) {
          setNewSubstitutionIds((prev) => {
            const next = new Set(prev);
            freshIds.forEach((id) => next.add(id));
            return next;
          });
        }

        const pitchEvents = extractPlayerPitchEvents(list);
        const freshPlayerIds = new Set();

        pitchEvents.forEach((ev) => {
          if (!knownPlayerEventIdsRef.current.has(ev.id)) {
            freshPlayerIds.add(ev.id);
          }
          knownPlayerEventIdsRef.current.add(ev.id);
        });

        if (isPoll && freshPlayerIds.size > 0) {
          const freshPitchEvents = pitchEvents.filter((ev) => freshPlayerIds.has(ev.id));

          if (!isFinishedRef.current) {
            triggerLivePlayerAnimations(freshPitchEvents);
          }

          setNewPlayerEventIds((prev) => {
            const next = new Set(prev);
            freshPlayerIds.forEach((id) => next.add(id));
            return next;
          });
        }
      } catch (err) {
        if (cancelled) return;
        console.error('[useMatchEvents]', err);
        if (!isPoll) {
          setError('No se pudieron cargar los cambios del partido.');
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
  }, [enabled, fixtureId, homeMeta, awayMeta, shouldPoll, pollIntervalMs, triggerLivePlayerAnimations]);

  const { substitutionsHome, substitutionsAway } = useMemo(
    () => pairSubstitutionsWithFixture(rawEvents, homeMeta, awayMeta),
    [rawEvents, homeMeta, awayMeta]
  );

  const eventsByPlayer = useMemo(
    () => buildEventsByPlayer(rawEvents),
    [rawEvents]
  );

  const clearNewFlag = useCallback((subId) => {
    setNewSubstitutionIds((prev) => {
      if (!prev.has(subId)) return prev;
      const next = new Set(prev);
      next.delete(subId);
      return next;
    });
  }, []);

  const clearNewPlayerEventFlag = useCallback((eventId) => {
    setNewPlayerEventIds((prev) => {
      if (!prev.has(eventId)) return prev;
      const next = new Set(prev);
      next.delete(eventId);
      return next;
    });
  }, []);

  return {
    loading,
    error,
    substitutionsHome,
    substitutionsAway,
    eventsByPlayer,
    isLive,
    isFinished,
    shouldPoll,
    newSubstitutionIds,
    newPlayerEventIds,
    animateEventByPlayer,
    liveEventToasts,
    clearNewFlag,
    clearNewPlayerEventFlag,
    refetch,
  };
}

export default useMatchEvents;
