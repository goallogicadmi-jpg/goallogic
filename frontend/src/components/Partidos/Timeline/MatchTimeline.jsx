import { useMemo, useRef, useEffect } from 'react';
import useMatchTimeline from '../../../hooks/useMatchTimeline';
import { getTimelineMaxMinute } from '../../../utils/matchEvents';
import MatchTimelineEvent from './MatchTimelineEvent';
import '../../../styles/matchTimeline.css';

/**
 * Timeline animado del partido (eventos cronológicos).
 */
export default function MatchTimeline({ fixtureId, partido }) {
  const horizontalRef = useRef(null);

  const {
    loading,
    error,
    timelineEvents,
    isLive,
    isFinished,
    newTimelineIds,
    clearNewTimelineFlag,
    refetch,
  } = useMatchTimeline(fixtureId, partido, {
    enabled: Boolean(fixtureId),
  });

  const maxMinute = useMemo(
    () => getTimelineMaxMinute(timelineEvents),
    [timelineEvents]
  );

  useEffect(() => {
    const el = horizontalRef.current;
    if (!el || timelineEvents.length === 0) return;
    el.scrollLeft = el.scrollWidth;
  }, [timelineEvents.length, fixtureId]);

  if (loading) {
    return (
      <div className="match-timeline match-timeline--loading">
        <p>Cargando timeline del partido…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="match-timeline match-timeline--error">
        <p>{error}</p>
        <button type="button" className="lineups-retry-btn" onClick={refetch}>
          Reintentar
        </button>
      </div>
    );
  }

  if (timelineEvents.length === 0) {
    return (
      <div className="match-timeline match-timeline--empty">
        <p>Sin eventos registrados</p>
      </div>
    );
  }

  return (
    <div className="match-timeline">
      <header className="match-timeline__header">
        <h3 className="match-timeline__title">Timeline del partido</h3>
        {isLive && !isFinished && (
          <span className="match-timeline__live-badge" aria-label="Partido en vivo">
            EN VIVO
          </span>
        )}
        <span className="match-timeline__count">{timelineEvents.length} eventos</span>
      </header>

      {/* Desktop: horizontal */}
      <div className="match-timeline__horizontal-wrap" ref={horizontalRef}>
        <div
          className="match-timeline__horizontal"
          style={{ '--match-timeline-max-minute': maxMinute }}
        >
          <div className="match-timeline__axis" aria-hidden="true">
            <span className="match-timeline__axis-label match-timeline__axis-label--home">
              {partido?.teams?.home?.name || 'Local'}
            </span>
            <div className="match-timeline__axis-line" />
            <span className="match-timeline__axis-label match-timeline__axis-label--away">
              {partido?.teams?.away?.name || 'Visitante'}
            </span>
          </div>

          <div className="match-timeline__horizontal-track">
            {timelineEvents.map((event) => {
              const percent = Math.min(
                98,
                Math.max(2, (event.sortMinute / maxMinute) * 100)
              );
              return (
                <MatchTimelineEvent
                  key={event.id}
                  event={event}
                  layout="horizontal"
                  positionPercent={percent}
                  isNew={newTimelineIds.has(event.id)}
                  onAnimated={clearNewTimelineFlag}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Móvil: vertical */}
      <ol className="match-timeline__vertical" aria-label="Eventos del partido">
        {timelineEvents.map((event) => (
          <li key={event.id}>
            <MatchTimelineEvent
              event={event}
              layout="vertical"
              isNew={newTimelineIds.has(event.id)}
              onAnimated={clearNewTimelineFlag}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
