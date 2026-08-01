import { getTimelineMaxMinute } from './matchEvents.js';
import { buildMatchMomentumFromTimeline } from './matchMomentum.js';

export const CARD_TIMELINE_MAX = 5;

const CARD_EVENT_KINDS = new Set([
  'goal',
  'goal_penalty',
  'goal_own',
  'card_yellow',
  'card_red',
  'card_second_yellow',
  'subst',
]);

/**
 * @param {Array} timelineEvents
 * @param {number} [max]
 */
export function selectCardTimelineEvents(timelineEvents, max = CARD_TIMELINE_MAX) {
  if (!Array.isArray(timelineEvents) || timelineEvents.length === 0) {
    return [];
  }

  const filtered = timelineEvents.filter((event) => CARD_EVENT_KINDS.has(event.kind));
  if (filtered.length <= max) {
    return filtered;
  }

  return filtered.slice(-max);
}

/**
 * @param {Array} timelineEvents
 * @param {Object|null} partido
 */
export function buildMiniMomentumData(timelineEvents, partido) {
  if (!timelineEvents?.length) {
    return null;
  }

  const maxMinute = getTimelineMaxMinute(timelineEvents);

  return buildMatchMomentumFromTimeline(timelineEvents, {
    chartMaxMinute: maxMinute,
    segmentMinutes: 15,
    homeColor: partido?.teams?.home?.colors?.primary || '#1565c0',
    awayColor: partido?.teams?.away?.colors?.primary || '#c62828',
  });
}

/**
 * @param {number|null|undefined} home
 * @param {number|null|undefined} away
 * @param {number|null|undefined} prevHome
 * @param {number|null|undefined} prevAway
 */
export function didFixtureScoreChange(home, away, prevHome, prevAway) {
  if (home == null || away == null || prevHome == null || prevAway == null) {
    return false;
  }

  return home > prevHome || away > prevAway;
}
