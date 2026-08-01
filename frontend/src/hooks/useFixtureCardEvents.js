import { useEffect, useMemo, useState } from 'react';
import { getFixtureEvents } from '../api/api';
import {
  buildTimelineFromEvents,
  extractEventsResponse,
  isFixtureFinished,
  isFixtureLive,
} from '../utils/matchEvents';

const POLL_MS = 35000;

/** @type {Map<number, { timelineEvents: Array, refCount: number, pollTimer: ReturnType<typeof setInterval>|null, listeners: Set<() => void>, metaKey: string }>} */
const fixtureStores = new Map();

/** @type {Map<number, Promise<void>>} */
const inflightFetches = new Map();

function shouldLoadCardEvents(partido) {
  if (!partido?.fixture?.id) return false;
  if (isFixtureLive(partido)) return true;
  if (isFixtureFinished(partido)) {
    const short = partido?.fixture?.status?.short;
    return short && !['NS', 'TBD', 'PST', 'CANC'].includes(short);
  }
  return false;
}

function buildMetaKey(homeMeta, awayMeta, teamColors) {
  return `${homeMeta.id}-${awayMeta.id}-${teamColors.homeColor}-${teamColors.awayColor}`;
}

function notifyListeners(store) {
  store.listeners.forEach((listener) => listener());
}

async function loadFixtureEvents(fixtureId, meta) {
  const existing = inflightFetches.get(fixtureId);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const payload = await getFixtureEvents(fixtureId);
      const list = extractEventsResponse(payload);
      const timeline = buildTimelineFromEvents(
        list,
        meta.homeMeta,
        meta.awayMeta,
        meta.teamColors
      );

      const store = fixtureStores.get(fixtureId);
      if (store) {
        store.timelineEvents = timeline;
        notifyListeners(store);
      }
    } catch (error) {
      console.error('[useFixtureCardEvents]', fixtureId, error);
    } finally {
      inflightFetches.delete(fixtureId);
    }
  })();

  inflightFetches.set(fixtureId, promise);
  return promise;
}

function ensureStore(fixtureId, meta, shouldPoll) {
  const metaKey = buildMetaKey(meta.homeMeta, meta.awayMeta, meta.teamColors);
  let store = fixtureStores.get(fixtureId);

  if (!store) {
    store = {
      timelineEvents: [],
      refCount: 0,
      pollTimer: null,
      listeners: new Set(),
      metaKey,
    };
    fixtureStores.set(fixtureId, store);
  } else if (store.metaKey !== metaKey) {
    store.metaKey = metaKey;
    store.timelineEvents = [];
    loadFixtureEvents(fixtureId, meta);
  }

  store.refCount += 1;

  if (!store.pollTimer) {
    loadFixtureEvents(fixtureId, meta);

    if (shouldPoll) {
      store.pollTimer = setInterval(() => {
        loadFixtureEvents(fixtureId, meta);
      }, POLL_MS);
    }
  }

  return store;
}

function releaseStore(fixtureId) {
  const store = fixtureStores.get(fixtureId);
  if (!store) return;

  store.refCount -= 1;

  if (store.refCount <= 0) {
    if (store.pollTimer) {
      clearInterval(store.pollTimer);
    }
    fixtureStores.delete(fixtureId);
  }
}

/**
 * Eventos ligeros para mini-timeline / mini-momentum en tarjetas del feed.
 * @param {number|string|null} fixtureId
 * @param {Object|null} partido
 */
export function useFixtureCardEvents(fixtureId, partido) {
  const enabled = shouldLoadCardEvents(partido);
  const shouldPoll = enabled && isFixtureLive(partido) && !isFixtureFinished(partido);

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
    [partido?.teams?.home?.colors?.primary, partido?.teams?.away?.colors?.primary]
  );

  const meta = useMemo(
    () => ({ homeMeta, awayMeta, teamColors }),
    [homeMeta, awayMeta, teamColors]
  );

  const [, setTick] = useState(0);

  useEffect(() => {
    if (!enabled || !fixtureId) {
      return undefined;
    }

    const store = ensureStore(fixtureId, meta, shouldPoll);
    const listener = () => setTick((value) => value + 1);
    store.listeners.add(listener);

    return () => {
      store.listeners.delete(listener);
      releaseStore(fixtureId);
    };
  }, [enabled, fixtureId, meta, shouldPoll]);

  const timelineEvents = enabled && fixtureId
    ? fixtureStores.get(fixtureId)?.timelineEvents || []
    : [];

  return {
    timelineEvents,
    enabled,
    shouldPoll,
  };
}

export default useFixtureCardEvents;
