import { useEffect, useMemo } from 'react';

const MAX_VISIBLE = 2;

const EVENT_ICONS = {
  goal: '⚽',
  goal_own: '🥅',
  goal_penalty: '⚽',
  penalty_missed: '⨯',
  card_yellow: '🟨',
  card_red: '🟥',
  injury: '✚',
  var: '🖥️',
};

function EventIcon({ kind }) {
  if (kind === 'card_second_yellow') {
    return (
      <span className="lineups-player-event__dual" aria-hidden="true">
        <span>🟨</span>
        <span>🟥</span>
      </span>
    );
  }

  const icon = EVENT_ICONS[kind] || '•';
  return <span aria-hidden="true">{icon}</span>;
}

function EventBadge({ event, isNew, onAnimated }) {
  useEffect(() => {
    if (!isNew) return undefined;
    const timer = setTimeout(() => onAnimated?.(event.id), 1200);
    return () => clearTimeout(timer);
  }, [isNew, onAnimated, event.id]);

  const tooltip = `Min ${event.minuteLabel} — ${event.label}`;

  return (
    <span
      className={`lineups-player-event${isNew ? ' lineups-player-event--new' : ''}`}
      title={tooltip}
      aria-label={tooltip}
      role="img"
    >
      <EventIcon kind={event.kind} />
    </span>
  );
}

/**
 * Iconos de eventos en vivo sobre el jugador (gol, tarjetas, VAR, etc.).
 */
export default function LineupsPlayerEvents({
  events = [],
  newEventIds,
  onEventAnimated,
  compact = false,
}) {
  const sorted = useMemo(
    () => [...events].sort((a, b) => a.sortMinute - b.sortMinute),
    [events]
  );

  if (sorted.length === 0) return null;

  const visible = sorted.slice(0, MAX_VISIBLE);
  const hidden = sorted.slice(MAX_VISIBLE);
  const overflow = hidden.length;

  const overflowTooltip = hidden
    .map((ev) => `Min ${ev.minuteLabel} — ${ev.label}`)
    .join('\n');

  return (
    <div
      className={`lineups-player-events${compact ? ' lineups-player-events--compact' : ''}`}
      aria-label="Eventos del jugador"
    >
      {visible.map((event) => (
        <EventBadge
          key={event.id}
          event={event}
          isNew={newEventIds?.has(event.id)}
          onAnimated={onEventAnimated}
        />
      ))}
      {overflow > 0 && (
        <span
          className="lineups-player-events__more"
          title={overflowTooltip}
          aria-label={`${overflow} eventos más: ${overflowTooltip.replace(/\n/g, '; ')}`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
