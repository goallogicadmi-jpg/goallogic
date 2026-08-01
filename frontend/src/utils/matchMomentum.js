/**
 * Construye datos de "momento del partido" a partir de eventos normalizados del timeline.
 */

export const MOMENTUM_SEGMENT_MINUTES = 5;

export const MOMENTUM_AXIS_MARKS = [
  { minute: 0, label: "0'" },
  { minute: 15, label: "15'" },
  { minute: 30, label: "30'" },
  { minute: 45, label: 'MT' },
  { minute: 60, label: "60'" },
  { minute: 75, label: "75'" },
  { minute: 90, label: 'FP' },
];

const GOAL_KINDS = new Set(['goal', 'goal_penalty', 'goal_own']);

const MOMENTUM_WEIGHTS = {
  goal: 14,
  goal_penalty: 14,
  goal_own: 12,
  penalty_missed: 7,
  card_red: 8,
  card_second_yellow: 8,
  card_yellow: 4,
  subst: 2,
  injury: 2,
  var: 1,
  generic: 0,
};

/**
 * @param {number} maxMinute
 */
export function resolveMomentumChartMaxMinute(maxMinute) {
  const parsed = Number(maxMinute);
  if (!Number.isFinite(parsed) || parsed <= 90) {
    return 90;
  }
  if (parsed <= 105) return 105;
  if (parsed <= 120) return 120;
  return Math.ceil(parsed / 15) * 15;
}

/**
 * @param {number} chartMaxMinute
 */
export function buildMomentumAxisMarks(chartMaxMinute = 90) {
  const marks = MOMENTUM_AXIS_MARKS.filter((mark) => mark.minute <= chartMaxMinute);

  if (chartMaxMinute > 90 && chartMaxMinute <= 105) {
    marks.push({ minute: 105, label: 'ET' });
  } else if (chartMaxMinute > 105) {
    marks.push({ minute: 105, label: "105'" });
    if (chartMaxMinute >= 120) {
      marks.push({ minute: 120, label: 'FP' });
    }
  }

  return marks;
}

/**
 * Marcas reducidas para móvil (evita solapamiento en pantallas ≤480px).
 * @param {number} chartMaxMinute
 * @param {{ ultraCompact?: boolean }} [options]
 */
export function buildMobileMomentumAxisMarks(chartMaxMinute = 90, options = {}) {
  const { ultraCompact = false } = options;
  const allMarks = buildMomentumAxisMarks(chartMaxMinute);

  if (ultraCompact) {
    const ultra = allMarks.filter((mark) => [0, 45, 60, 90, 105, 120].includes(mark.minute));
    return ultra.length >= 3 ? ultra : allMarks.filter((_, index) => index % 2 === 0);
  }

  const preferred = [0, 30, 45, 60, 75, 90, 105, 120];
  const picked = allMarks.filter((mark) => preferred.includes(mark.minute));

  if (picked.length >= 4) {
    return picked;
  }

  return allMarks.filter((_, index) => index % 2 === 0 || index === allMarks.length - 1);
}

/**
 * Separa iconos de gol cuando están demasiado cerca en el eje.
 * @param {Array} goalMarkers
 * @param {number} [minGapPercent]
 */
export function spreadGoalMarkers(goalMarkers, minGapPercent = 3.5) {
  if (!Array.isArray(goalMarkers) || goalMarkers.length === 0) {
    return [];
  }

  const sorted = goalMarkers
    .map((marker) => ({ ...marker, verticalOffset: 0 }))
    .sort((left, right) => left.leftPercent - right.leftPercent);

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    const gap = current.leftPercent - previous.leftPercent;

    if (gap < minGapPercent) {
      current.verticalOffset = (previous.verticalOffset || 0) + 10;
      if (gap < 1.5) {
        current.leftPercent = Math.min(98, previous.leftPercent + minGapPercent * 0.75);
      }
    }
  }

  return sorted;
}

/**
 * @param {Array} timelineEvents
 * @param {number} chartMaxMinute
 */
function applyTimelineEventToSegments(segments, event, segmentSize, chartMaxMinute) {
  const minute = Number(event?.sortMinute ?? 0);
  if (!Number.isFinite(minute) || minute < 0) return;

  const cappedMinute = Math.min(minute, chartMaxMinute);
  const index = Math.min(
    segments.length - 1,
    Math.max(0, Math.floor(cappedMinute / segmentSize))
  );

  const kind = event?.kind || 'generic';
  const weight = MOMENTUM_WEIGHTS[kind] ?? 0;
  if (weight <= 0) return;

  if (kind === 'goal_own') {
    if (event.side === 'home') {
      segments[index].away += weight;
    } else if (event.side === 'away') {
      segments[index].home += weight;
    }
    return;
  }

  if (event.side === 'home') {
    segments[index].home += weight;
  } else if (event.side === 'away') {
    segments[index].away += weight;
  }
}

/**
 * Suavizado simple para evitar picos aislados.
 * @param {number[]} values
 * @param {number} [windowSize]
 */
export function smoothMomentumValues(values, windowSize = 3) {
  if (!values.length) return [];
  const half = Math.floor(windowSize / 2);

  return values.map((_, index) => {
    let sum = 0;
    let count = 0;

    for (let offset = -half; offset <= half; offset += 1) {
      const target = index + offset;
      if (target < 0 || target >= values.length) continue;
      sum += values[target];
      count += 1;
    }

    return count > 0 ? sum / count : 0;
  });
}

/**
 * @param {Array} timelineEvents
 * @param {{ chartMaxMinute?: number, segmentMinutes?: number, homeColor?: string, awayColor?: string }} [options]
 */
export function buildMatchMomentumFromTimeline(timelineEvents, options = {}) {
  const {
    chartMaxMinute: rawMax = 90,
    segmentMinutes = MOMENTUM_SEGMENT_MINUTES,
    homeColor = '#1565c0',
    awayColor = '#c62828',
  } = options;

  const chartMaxMinute = resolveMomentumChartMaxMinute(rawMax);
  const segmentSize = Math.max(1, segmentMinutes);
  const segmentCount = Math.ceil(chartMaxMinute / segmentSize);

  const rawSegments = Array.from({ length: segmentCount }, () => ({ home: 0, away: 0 }));

  (timelineEvents || []).forEach((event) => {
    applyTimelineEventToSegments(rawSegments, event, segmentSize, chartMaxMinute);
  });

  const netValues = rawSegments.map((segment) => segment.home - segment.away);
  const smoothedNet = smoothMomentumValues(netValues, 3);
  const maxAbs = Math.max(1, ...smoothedNet.map((value) => Math.abs(value)));

  const bars = smoothedNet.map((net, index) => {
    const startMinute = index * segmentSize;
    const endMinute = Math.min(chartMaxMinute, startMinute + segmentSize);
    const heightPercent = Math.round((Math.abs(net) / maxAbs) * 100);

    return {
      index,
      startMinute,
      endMinute,
      centerMinute: startMinute + segmentSize / 2,
      net,
      heightPercent: Math.max(net !== 0 ? 12 : 0, heightPercent),
      side: net > 0 ? 'home' : net < 0 ? 'away' : 'neutral',
    };
  });

  const goalMarkers = spreadGoalMarkers(
    (timelineEvents || [])
      .filter((event) => GOAL_KINDS.has(event.kind))
      .map((event) => ({
        id: event.id,
        kind: event.kind,
        icon: event.icon,
        minute: event.sortMinute,
        minuteLabel: event.minuteLabel,
        side: event.side,
        teamColor: event.teamColor,
        playerName: event.playerName,
        leftPercent: Math.min(
          98,
          Math.max(2, (Number(event.sortMinute) / chartMaxMinute) * 100)
        ),
      }))
  );

  return {
    chartMaxMinute,
    segmentMinutes: segmentSize,
    bars,
    goalMarkers,
    axisMarks: buildMomentumAxisMarks(chartMaxMinute),
    homeColor,
    awayColor,
  };
}
