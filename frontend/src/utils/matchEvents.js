/**
 * Utilidades para eventos de partido (API-Football v3).
 */

import { isSameTeamId } from './matchLineups.js';

const LIVE_STATUSES = new Set(['1H', '2H', 'HT', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE']);
const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO', 'CANC', 'ABD', 'PST']);

/**
 * @param {Object|null} partido
 */
export function getFixtureStatusShort(partido) {
  return (
    partido?.fixture?.status?.short ||
    partido?.status?.short ||
    ''
  ).toUpperCase();
}

/**
 * @param {Object|null} partido
 */
export function isFixtureLive(partido) {
  const status = getFixtureStatusShort(partido);
  return LIVE_STATUSES.has(status);
}

/**
 * @param {Object|null} partido
 */
export function isFixtureFinished(partido) {
  const status = getFixtureStatusShort(partido);
  if (FINISHED_STATUSES.has(status)) return true;
  const long = (partido?.fixture?.status?.long || '').toLowerCase();
  return long.includes('finished') || long.includes('final');
}

/**
 * @param {Object|Array|null} payload
 */
export function extractEventsResponse(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.response)) return payload.response;
  if (Array.isArray(payload.events)) return payload.events;
  return [];
}

/**
 * @param {Object} event
 */
export function isSubstitutionEvent(event) {
  const type = String(event?.type || '').toLowerCase();
  const detail = String(event?.detail || '').toLowerCase();
  return type === 'subst' || detail.includes('substitution');
}

/**
 * @param {Object} event
 */
export function formatEventMinute(event) {
  const elapsed = event?.time?.elapsed ?? 0;
  const extra = event?.time?.extra;
  if (extra != null && Number(extra) > 0) {
    return `${elapsed}+${extra}`;
  }
  return String(elapsed);
}

/**
 * Clave estable para deduplicar sustituciones entre polls.
 * @param {Object} event
 */
export function buildSubstitutionKey(event) {
  const teamId = event?.team?.id ?? 'team';
  const elapsed = event?.time?.elapsed ?? 0;
  const extra = event?.time?.extra ?? 0;
  const outId = event?.player?.id ?? event?.player?.name ?? 'out';
  const inId = event?.assist?.id ?? event?.assist?.name ?? 'in';
  return `${teamId}-${elapsed}-${extra}-${outId}-${inId}`;
}

/**
 * @param {Object} event
 * @returns {import('./matchEvents').NormalizedSubstitution}
 */
export function normalizeSubstitutionEvent(event) {
  const elapsed = Number(event?.time?.elapsed ?? 0);
  const extra = event?.time?.extra != null ? Number(event.time.extra) : 0;
  const sortMinute = elapsed + extra * 0.01;

  return {
    id: buildSubstitutionKey(event),
    minute: elapsed,
    extra,
    sortMinute,
    minuteLabel: formatEventMinute(event),
    playerOut: {
      id: event?.player?.id ?? null,
      name: event?.player?.name || 'Sale',
    },
    playerIn: {
      id: event?.assist?.id ?? null,
      name: event?.assist?.name || 'Entra',
    },
    teamId: event?.team?.id ?? null,
  };
}

/**
 * @param {Array} events
 */
export function extractSubstitutionsFromEvents(events) {
  return (events || [])
    .filter(isSubstitutionEvent)
    .map(normalizeSubstitutionEvent)
    .sort((a, b) => a.sortMinute - b.sortMinute);
}

/**
 * @param {Array} events
 * @param {{ id?: number|string }} homeMeta
 * @param {{ id?: number|string }} awayMeta
 */
export function pairSubstitutionsWithFixture(events, homeMeta, awayMeta) {
  const all = extractSubstitutionsFromEvents(events);

  const home = all.filter((s) => isSameTeamId(s.teamId, homeMeta.id));
  const away = all.filter((s) => isSameTeamId(s.teamId, awayMeta.id));

  const unassigned = all.filter(
    (s) => !isSameTeamId(s.teamId, homeMeta.id) && !isSameTeamId(s.teamId, awayMeta.id)
  );

  if (unassigned.length > 0 && home.length === 0 && away.length > 0) {
    return { substitutionsHome: [], substitutionsAway: away };
  }
  if (unassigned.length > 0 && away.length === 0 && home.length > 0) {
    return { substitutionsHome: home, substitutionsAway: [] };
  }

  if (unassigned.length > 0 && home.length === 0 && away.length === 0 && all.length > 0) {
    const mid = Math.ceil(all.length / 2);
    return {
      substitutionsHome: all.slice(0, mid),
      substitutionsAway: all.slice(mid),
    };
  }

  return { substitutionsHome: home, substitutionsAway: away };
}

/** @typedef {'goal'|'goal_own'|'goal_penalty'|'penalty_missed'|'card_yellow'|'card_red'|'card_second_yellow'|'injury'|'var'} PlayerPitchEventKind */

/**
 * @param {Object} event
 * @returns {PlayerPitchEventKind|null}
 */
export function getPlayerPitchEventKind(event) {
  const type = String(event?.type || '').toLowerCase();
  const detail = String(event?.detail || '').toLowerCase();

  if (type === 'goal') {
    if (detail.includes('own goal')) return 'goal_own';
    if (detail.includes('missed penalty')) return 'penalty_missed';
    if (detail.includes('penalty')) return 'goal_penalty';
    return 'goal';
  }

  if (type === 'card') {
    if (detail.includes('second yellow')) return 'card_second_yellow';
    if (detail.includes('red card')) return 'card_red';
    if (detail.includes('yellow')) return 'card_yellow';
    return 'card_yellow';
  }

  if (type === 'injury') return 'injury';
  if (type === 'var') return 'var';

  return null;
}

/**
 * @param {Object} event
 */
export function isPlayerPitchEvent(event) {
  if (isSubstitutionEvent(event)) return false;
  return getPlayerPitchEventKind(event) != null;
}

/**
 * @param {PlayerPitchEventKind} kind
 * @param {string} [detail]
 */
export function getPlayerEventLabel(kind, detail = '') {
  const detailTrim = String(detail || '').trim();

  switch (kind) {
    case 'goal':
      return 'Gol';
    case 'goal_own':
      return 'Gol en contra';
    case 'goal_penalty':
      return 'Penal anotado';
    case 'penalty_missed':
      return 'Penal fallado';
    case 'card_yellow':
      return 'Tarjeta amarilla';
    case 'card_red':
      return 'Tarjeta roja';
    case 'card_second_yellow':
      return 'Segunda amarilla';
    case 'injury':
      return 'Lesión';
    case 'var':
      return detailTrim || 'VAR';
    default:
      return detailTrim || 'Evento';
  }
}

/**
 * @param {Object} event
 * @param {PlayerPitchEventKind} kind
 */
export function buildPlayerEventKey(event, kind) {
  const playerId = event?.player?.id ?? 'player';
  const elapsed = event?.time?.elapsed ?? 0;
  const extra = event?.time?.extra ?? 0;
  const detail = String(event?.detail || '').trim();
  return `${playerId}-${kind}-${elapsed}-${extra}-${detail}`;
}

/**
 * @param {Object} event
 */
export function normalizePlayerPitchEvent(event) {
  const kind = getPlayerPitchEventKind(event);
  if (!kind) return null;

  const playerId = event?.player?.id;
  if (playerId == null || playerId === '') return null;

  const elapsed = Number(event?.time?.elapsed ?? 0);
  const extra = event?.time?.extra != null ? Number(event.time.extra) : 0;
  const sortMinute = elapsed + extra * 0.01;
  const detailStr = String(event?.detail || '').trim();
  const assistName = event?.assist?.name || null;

  let label = getPlayerEventLabel(kind, detailStr);
  if ((kind === 'goal' || kind === 'goal_penalty') && assistName) {
    label = `${label} (asistencia: ${assistName})`;
  }

  return {
    id: buildPlayerEventKey(event, kind),
    kind,
    playerId,
    playerName: event?.player?.name || null,
    minute: elapsed,
    extra,
    sortMinute,
    minuteLabel: formatEventMinute(event),
    label,
    detail: detailStr,
    assistName,
    teamId: event?.team?.id ?? null,
  };
}

const LIVE_EVENT_TOAST_ICONS = {
  goal: '⚽',
  goal_own: '🥅',
  goal_penalty: '⚽',
  penalty_missed: '⨯',
  card_yellow: '🟨',
  card_red: '🟥',
  card_second_yellow: '🟨',
  injury: '✚',
  var: '🖥️',
};

/**
 * Clase CSS de animación en cancha según tipo de evento.
 * @param {PlayerPitchEventKind} kind
 */
export function getEventAnimationClass(kind) {
  switch (kind) {
    case 'goal':
    case 'goal_own':
      return 'event-pulse-goal';
    case 'goal_penalty':
      return 'event-penalty-green';
    case 'penalty_missed':
      return 'event-penalty-red';
    case 'card_yellow':
    case 'card_second_yellow':
      return 'event-flash-yellow';
    case 'card_red':
      return 'event-flash-red';
    case 'var':
      return 'event-var-blink';
    case 'injury':
      return 'event-injury-shake';
    default:
      return 'event-pulse-goal';
  }
}

/**
 * Mensaje para toast de evento en vivo.
 * @param {{ kind: string, label: string, playerName?: string|null, minuteLabel: string }} event
 */
export function buildLiveEventToastMessage(event) {
  const icon = LIVE_EVENT_TOAST_ICONS[event.kind] || '•';
  const name = event.playerName || 'Jugador';
  return `${icon} ${event.label} de ${name} (${event.minuteLabel}')`;
}

/**
 * @param {Array} events
 */
export function extractPlayerPitchEvents(events) {
  return (events || [])
    .filter(isPlayerPitchEvent)
    .map(normalizePlayerPitchEvent)
    .filter(Boolean)
    .sort((a, b) => a.sortMinute - b.sortMinute);
}

/**
 * Agrupa eventos de cancha por jugador (titulares / suplentes con id).
 * @param {Array} events
 * @returns {Record<string, import('./matchEvents').NormalizedPlayerPitchEvent[]>}
 */
export function buildEventsByPlayer(events) {
  const byPlayer = {};

  extractPlayerPitchEvents(events).forEach((ev) => {
    const key = String(ev.playerId);
    if (!byPlayer[key]) byPlayer[key] = [];
    byPlayer[key].push(ev);
  });

  return byPlayer;
}

/** @typedef {'goal'|'goal_own'|'goal_penalty'|'penalty_missed'|'card_yellow'|'card_red'|'card_second_yellow'|'injury'|'var'|'subst'|'generic'} TimelineEventKind */

export const TIMELINE_EVENT_ICONS = {
  goal: '⚽',
  goal_own: '🥅',
  goal_penalty: '⚽',
  penalty_missed: '⨯',
  card_yellow: '🟨',
  card_red: '🟥',
  card_second_yellow: '🟨🟥',
  injury: '✚',
  var: '🖥️',
  subst: '⤵',
  generic: '●',
};

const IMPORTANT_TIMELINE_KINDS = new Set([
  'goal',
  'goal_own',
  'goal_penalty',
  'penalty_missed',
  'card_red',
  'card_second_yellow',
  'var',
]);

/**
 * @param {Object} event
 * @returns {TimelineEventKind}
 */
export function getTimelineEventKind(event) {
  if (isSubstitutionEvent(event)) return 'subst';

  const pitchKind = getPlayerPitchEventKind(event);
  if (pitchKind) return pitchKind;

  return 'generic';
}

/**
 * @param {Object} event
 * @param {TimelineEventKind} kind
 */
export function buildTimelineEventId(event, kind) {
  if (kind === 'subst') return buildSubstitutionKey(event);

  const teamId = event?.team?.id ?? 'team';
  const elapsed = event?.time?.elapsed ?? 0;
  const extra = event?.time?.extra ?? 0;
  const playerId = event?.player?.id ?? event?.player?.name ?? 'player';
  const detail = String(event?.detail || event?.type || '').trim();
  return `tl-${kind}-${teamId}-${elapsed}-${extra}-${playerId}-${detail}`;
}

/**
 * @param {TimelineEventKind} kind
 */
export function isImportantTimelineKind(kind) {
  return IMPORTANT_TIMELINE_KINDS.has(kind);
}

/**
 * @param {Object} event
 * @param {TimelineEventKind} kind
 */
export function getTimelineEventDescription(event, kind) {
  const detail = String(event?.detail || '').trim();

  if (kind === 'subst') {
    const out = event?.player?.name || 'Sale';
    const inName = event?.assist?.name || 'Entra';
    return `${out} → ${inName}`;
  }

  if (kind === 'generic') {
    return detail || String(event?.type || 'Evento');
  }

  return getPlayerEventLabel(kind, detail);
}

/**
 * Etiqueta legible del tipo de evento (tooltip / detalle).
 * @param {TimelineEventKind} kind
 */
export function getTimelineEventTypeLabel(kind) {
  switch (kind) {
    case 'goal':
      return 'Gol';
    case 'goal_own':
      return 'Gol en contra';
    case 'goal_penalty':
      return 'Penal anotado';
    case 'penalty_missed':
      return 'Penal fallado';
    case 'card_yellow':
      return 'Tarjeta amarilla';
    case 'card_red':
      return 'Tarjeta roja';
    case 'card_second_yellow':
      return 'Segunda amarilla';
    case 'injury':
      return 'Lesión';
    case 'var':
      return 'VAR';
    case 'subst':
      return 'Sustitución';
    default:
      return 'Evento';
  }
}

/**
 * Nombre corto estilo SofaScore: "W. Báez".
 * @param {string|null|undefined} name
 * @param {number} [maxLen]
 */
export function shortenDisplayName(name, maxLen = 16) {
  if (!name) return '';
  const trimmed = String(name).trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const initial = parts[0].charAt(0).toUpperCase();
    const last = parts[parts.length - 1];
    const short = `${initial}. ${last}`;
    if (short.length <= maxLen) return short;
    return `${initial}. ${last.slice(0, Math.max(1, maxLen - 4))}`;
  }
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

/**
 * @param {string|null|undefined} name
 * @param {number} [maxLen]
 */
export function shortenTeamName(name, maxLen = 14) {
  if (!name) return '';
  const trimmed = String(name).trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

/**
 * Texto de una línea para el timeline compacto.
 * @param {Object} event
 * @param {TimelineEventKind} kind
 * @param {{ teamName?: string }} [meta]
 */
export function buildTimelineCompactLine(event, kind, meta = {}) {
  const teamName = meta.teamName || '';
  const shortPlayer = shortenDisplayName(event?.player?.name);
  const shortTeam = shortenTeamName(teamName);
  const detail = String(event?.detail || '').trim();

  switch (kind) {
    case 'subst': {
      const shortOut = shortenDisplayName(event?.player?.name);
      const shortIn = shortenDisplayName(event?.assist?.name);
      if (shortOut && shortIn) return `${shortOut} → ${shortIn}`;
      return shortOut || shortIn || 'Cambio';
    }
    case 'goal':
    case 'goal_penalty':
      return shortTeam ? `Gol ${shortTeam}` : shortPlayer || 'Gol';
    case 'goal_own':
      return shortPlayer ? `Gol e.c. ${shortPlayer}` : 'Gol en contra';
    case 'penalty_missed':
      return shortPlayer ? `Penal fallado ${shortPlayer}` : 'Penal fallado';
    case 'card_yellow':
    case 'card_red':
    case 'card_second_yellow':
    case 'injury':
      return shortPlayer || getTimelineEventTypeLabel(kind);
    case 'var':
      if (detail) {
        return detail.length > 24 ? `${detail.slice(0, 23)}…` : detail;
      }
      return 'VAR';
    case 'generic':
      if (shortPlayer) return shortPlayer;
      if (detail) return detail.length > 24 ? `${detail.slice(0, 23)}…` : detail;
      return 'Evento';
    default:
      return shortPlayer || shortTeam || 'Evento';
  }
}

/**
 * @param {Object} event
 * @param {TimelineEventKind} kind
 * @param {string} compactLine
 * @param {{ teamName?: string }} [meta]
 */
export function shouldShowTimelineTooltip(event, kind, compactLine, meta = {}) {
  const player = event?.player?.name || '';
  const assist = event?.assist?.name || '';
  const detail = String(event?.detail || '').trim();
  const teamName = meta.teamName || '';

  switch (kind) {
    case 'card_yellow':
    case 'card_red':
    case 'card_second_yellow':
    case 'injury':
      return true;
    case 'subst':
      return (
        (player && shortenDisplayName(player) !== player) ||
        (assist && shortenDisplayName(assist) !== assist)
      );
    case 'goal':
    case 'goal_penalty':
      if (assist) return true;
      if (player && !compactLine.includes(player)) {
        const last = player.split(/\s+/).pop();
        return !compactLine.includes(last);
      }
      return false;
    case 'goal_own':
      return Boolean(player && !compactLine.includes(player));
    case 'penalty_missed':
      return Boolean(player && shortenDisplayName(player) !== player);
    case 'var':
      return Boolean(detail && detail.length > compactLine.length);
    case 'generic':
      return Boolean(detail && detail !== compactLine);
    default:
      return Boolean(teamName && !compactLine.includes(teamName));
  }
}

/**
 * Tooltip con detalle completo; null si no aporta más que la línea compacta.
 * @param {Object} event
 * @param {TimelineEventKind} kind
 * @param {string} compactLine
 * @param {{ teamName?: string }} [meta]
 */
export function buildTimelineTooltip(event, kind, compactLine, meta = {}) {
  if (!shouldShowTimelineTooltip(event, kind, compactLine, meta)) {
    return null;
  }

  const minute = formatEventMinute(event);
  const typeLabel = getTimelineEventTypeLabel(kind);
  const player = event?.player?.name || '';
  const assist = event?.assist?.name || '';
  const detail = String(event?.detail || '').trim();
  const teamName = meta.teamName || '';

  const parts = [`${minute}'`];
  if (typeLabel) parts.push(typeLabel);

  if (kind === 'subst') {
    if (player) parts.push(`${player} sale`);
    if (assist) parts.push(`Entra ${assist}`);
  } else {
    if (player) parts.push(player);
    if ((kind === 'goal' || kind === 'goal_penalty') && assist) {
      parts.push(`Asistencia: ${assist}`);
    }
  }

  if (detail && kind !== 'subst') {
    const normDetail = detail.toLowerCase();
    const normType = (typeLabel || '').toLowerCase();
    const inCompact = compactLine.toLowerCase().includes(normDetail);
    if (!inCompact && normDetail !== normType) {
      parts.push(detail);
    }
  }

  if (
    teamName &&
    (kind === 'goal' || kind === 'goal_penalty' || kind === 'goal_own') &&
    !parts.includes(teamName)
  ) {
    parts.push(teamName);
  }

  const tooltip = parts.filter(Boolean).join(' · ');
  if (!tooltip || tooltip === compactLine) return null;
  return tooltip;
}

/**
 * @param {Object} event
 * @param {{ id?: number|string, name?: string, logo?: string }} homeMeta
 * @param {{ id?: number|string, name?: string, logo?: string }} awayMeta
 * @param {{ homeColor?: string, awayColor?: string }} [teamColors]
 */
export function normalizeTimelineEvent(event, homeMeta, awayMeta, teamColors = {}) {
  const kind = getTimelineEventKind(event);
  const elapsed = Number(event?.time?.elapsed ?? 0);
  const extra = event?.time?.extra != null ? Number(event.time.extra) : 0;
  const sortMinute = elapsed + extra * 0.01;
  const detail = String(event?.detail || '').trim();
  const teamId = event?.team?.id ?? null;

  let side = 'neutral';
  if (isSameTeamId(teamId, homeMeta.id)) side = 'home';
  else if (isSameTeamId(teamId, awayMeta.id)) side = 'away';

  const teamName =
    side === 'home'
      ? homeMeta.name
      : side === 'away'
        ? awayMeta.name
        : event?.team?.name || '';

  const teamLogo =
    side === 'home'
      ? homeMeta.logo
      : side === 'away'
        ? awayMeta.logo
        : event?.team?.logo;

  const teamColor =
    side === 'home'
      ? teamColors.homeColor || '#1565c0'
      : side === 'away'
        ? teamColors.awayColor || '#c62828'
        : '#607d8b';

  const label = getTimelineEventDescription(event, kind);
  const playerName = event?.player?.name || null;
  const assistName = event?.assist?.name || null;
  const compactLine = buildTimelineCompactLine(event, kind, { teamName });
  const tooltip = buildTimelineTooltip(event, kind, compactLine, { teamName });

  return {
    id: buildTimelineEventId(event, kind),
    kind,
    icon: TIMELINE_EVENT_ICONS[kind] || TIMELINE_EVENT_ICONS.generic,
    minute: elapsed,
    extra,
    sortMinute,
    minuteLabel: formatEventMinute(event),
    label,
    compactLine,
    detail,
    playerName,
    playerOut: kind === 'subst' ? event?.player?.name || null : null,
    playerIn: kind === 'subst' ? event?.assist?.name || null : null,
    assistName,
    teamId,
    teamName,
    teamLogo,
    teamColor,
    side,
    isImportant: isImportantTimelineKind(kind),
    tooltip,
    hasTooltip: Boolean(tooltip),
  };
}

/**
 * @param {Array} events
 * @param {{ id?: number|string, name?: string, logo?: string }} homeMeta
 * @param {{ id?: number|string, name?: string, logo?: string }} awayMeta
 * @param {{ homeColor?: string, awayColor?: string }} [teamColors]
 */
export function buildTimelineFromEvents(events, homeMeta, awayMeta, teamColors = {}) {
  return (events || [])
    .map((event) => normalizeTimelineEvent(event, homeMeta, awayMeta, teamColors))
    .sort((a, b) => {
      if (a.sortMinute !== b.sortMinute) return a.sortMinute - b.sortMinute;
      return String(a.id).localeCompare(String(b.id));
    });
}

/**
 * @param {Array} timelineEvents
 */
export function getTimelineMaxMinute(timelineEvents) {
  if (!timelineEvents?.length) return 90;
  const max = Math.max(...timelineEvents.map((e) => e.sortMinute));
  return Math.max(90, Math.ceil(max));
}
