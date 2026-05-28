import { useEffect, useState } from 'react';

/**
 * Evento compacto del timeline (icono + minuto + texto corto).
 */
export default function MatchTimelineEvent({
  event,
  layout = 'vertical',
  isNew = false,
  onAnimated,
  positionPercent,
}) {
  const [tooltipOpen, setTooltipOpen] = useState(false);

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

  const compactText = event.compactLine || event.label || '';

  return (
    <article
      className={`match-timeline-event ${sideClass} ${layoutClass}${isNew ? ' match-timeline-event--new' : ''}${event.isImportant ? ' match-timeline-event--important' : ''}${event.hasTooltip ? ' match-timeline-event--has-tooltip' : ''}`}
      style={style}
      onMouseEnter={() => event.hasTooltip && setTooltipOpen(true)}
      onMouseLeave={() => setTooltipOpen(false)}
      onFocus={() => event.hasTooltip && setTooltipOpen(true)}
      onBlur={() => setTooltipOpen(false)}
      onClick={() => {
        if (!event.hasTooltip) return;
        setTooltipOpen((open) => !open);
      }}
      tabIndex={event.hasTooltip ? 0 : undefined}
    >
      <div className="match-timeline-event__connector" aria-hidden="true" />
      <div className="match-timeline-event__card">
        <span className="match-timeline-event__minute">{event.minuteLabel}&apos;</span>
        <span className="match-timeline-event__icon" aria-hidden="true">
          {event.icon}
        </span>
        <span className="match-timeline-event__compact" title={!event.hasTooltip ? compactText : undefined}>
          {compactText}
        </span>
      </div>

      {event.hasTooltip && tooltipOpen && (
        <div className="match-timeline-event__tooltip" role="tooltip">
          {event.tooltip}
        </div>
      )}
    </article>
  );
}
