import { useMemo } from 'react';
import { selectCardTimelineEvents } from '../../utils/matchCardHelpers';
import { shortenTeamName } from '../../utils/matchEvents';

/**
 * Mini-timeline compacta para tarjetas del feed.
 * @param {{ timelineEvents: Array, homeName?: string, awayName?: string }} props
 */
export default function PartidoCardMiniTimeline({
  timelineEvents,
  homeName = 'Local',
  awayName = 'Visitante',
}) {
  const events = useMemo(
    () => selectCardTimelineEvents(timelineEvents),
    [timelineEvents]
  );

  if (events.length === 0) {
    return null;
  }

  return (
    <ul className="partido-card-mini-timeline" aria-label="Eventos clave del partido">
      {events.map((event) => {
        const teamLabel = event.side === 'home'
          ? shortenTeamName(homeName, 10)
          : event.side === 'away'
            ? shortenTeamName(awayName, 10)
            : shortenTeamName(event.teamName, 10);

        return (
          <li
            key={event.id}
            className={`partido-card-mini-timeline__item partido-card-mini-timeline__item--${event.side}`}
            style={{ '--event-team-color': event.teamColor }}
          >
            <span className="partido-card-mini-timeline__minute">{event.minuteLabel}&apos;</span>
            <span className="partido-card-mini-timeline__icon" aria-hidden="true">{event.icon}</span>
            <span className="partido-card-mini-timeline__team">{teamLabel}</span>
          </li>
        );
      })}
    </ul>
  );
}
