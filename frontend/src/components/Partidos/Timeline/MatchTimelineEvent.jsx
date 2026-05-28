import { useEffect } from 'react';

/**
 * Tarjeta de un evento en el timeline del partido.
 */
export default function MatchTimelineEvent({
  event,
  layout = 'vertical',
  isNew = false,
  onAnimated,
  positionPercent,
}) {
  useEffect(() => {
    if (!isNew) return undefined;
    const timer = setTimeout(() => onAnimated?.(event.id), 1400);
    return () => clearTimeout(timer);
  }, [isNew, onAnimated, event.id]);

  const sideClass =
    event.side === 'home' ? 'match-timeline-event--home' : 'match-timeline-event--away';

  const layoutClass =
    layout === 'horizontal' ? 'match-timeline-event--horizontal' : 'match-timeline-event--vertical';

  const style = {
    '--match-timeline-team-color': event.teamColor,
  };

  if (layout === 'horizontal' && positionPercent != null) {
    style.left = `${positionPercent}%`;
  }

  return (
    <article
      className={`match-timeline-event ${sideClass} ${layoutClass}${isNew ? ' match-timeline-event--new' : ''}${event.isImportant ? ' match-timeline-event--important' : ''}`}
      style={style}
      title={event.tooltip}
    >
      <div className="match-timeline-event__connector" aria-hidden="true" />
      <div className="match-timeline-event__card">
        <span className="match-timeline-event__minute">{event.minuteLabel}&apos;</span>
        <span className="match-timeline-event__icon" aria-hidden="true">
          {event.icon}
        </span>
        <div className="match-timeline-event__body">
          {event.teamLogo && (
            <img src={event.teamLogo} alt="" className="match-timeline-event__team-logo" />
          )}
          <p className="match-timeline-event__label">{event.label}</p>
          {event.playerName && event.kind !== 'subst' && (
            <p className="match-timeline-event__player">{event.playerName}</p>
          )}
          {event.kind === 'subst' && (
            <p className="match-timeline-event__player">
              {event.playerOut} → {event.playerIn}
            </p>
          )}
          {event.teamName && (
            <p className="match-timeline-event__team">{event.teamName}</p>
          )}
        </div>
      </div>
    </article>
  );
}
