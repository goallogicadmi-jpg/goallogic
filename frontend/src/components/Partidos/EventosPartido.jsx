import useMatchTimeline from '../../hooks/useMatchTimeline';
import { getTimelineEventTypeLabel } from '../../utils/matchEvents';
import '../../styles/partidos.css';

/**
 * Lista cronológica compacta de eventos del partido (fusión Eventos + Timeline).
 * @param {{ timeline?: ReturnType<typeof useMatchTimeline> }} props
 */
export default function EventosPartido({ fixtureId, partido, timeline: timelineProp }) {
  const internalTimeline = useMatchTimeline(fixtureId, partido, {
    enabled: Boolean(fixtureId) && !timelineProp,
  });
  const timeline = timelineProp || internalTimeline;

  const {
    loading,
    error,
    timelineEvents,
    isLive,
    isFinished,
    newTimelineIds,
    clearNewTimelineFlag,
    refetch,
  } = timeline;
  if (loading) {
    return (
      <div className="match-center-loading">
        <p>Cargando eventos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="match-center-error">
        <p>{error}</p>
        <button type="button" className="lineups-retry-btn" onClick={refetch}>
          Reintentar
        </button>
      </div>
    );
  }

  if (timelineEvents.length === 0) {
    return (
      <div className="match-center-empty">
        <p>No hay eventos disponibles para este partido.</p>
      </div>
    );
  }

  return (
    <div className="eventos-lista-container">
      <div className="eventos-lista-header">
        <h3 className="eventos-lista-title">Eventos del partido</h3>
        {isLive && !isFinished && (
          <span className="eventos-lista-live-badge" aria-label="Partido en vivo">
            EN VIVO
          </span>
        )}
        <span className="eventos-lista-count">{timelineEvents.length} eventos</span>
      </div>

      <ol className="eventos-lista" aria-label="Eventos del partido en orden cronológico">
        {timelineEvents.map((event) => {
          const isNew = newTimelineIds.has(event.id);
          const typeLabel = getTimelineEventTypeLabel(event.kind);

          return (
            <li
              key={event.id}
              className={`eventos-lista-item eventos-lista-item--${event.side}${isNew ? ' eventos-lista-item--new' : ''}${event.isImportant ? ' eventos-lista-item--important' : ''}`}
              style={{ '--event-team-color': event.teamColor }}
              onAnimationEnd={() => {
                if (isNew) clearNewTimelineFlag(event.id);
              }}
            >
              <div className="eventos-lista-minute">{event.minuteLabel}&apos;</div>

              <div className="eventos-lista-icon" aria-hidden="true">
                {event.icon}
              </div>

              <div className="eventos-lista-body">
                <div className="eventos-lista-topline">
                  <span className="eventos-lista-type">{typeLabel}</span>
                  <span className="eventos-lista-team">{event.teamName}</span>
                </div>

                <p className="eventos-lista-description">{event.label}</p>

                {event.detail && event.detail !== event.label && (
                  <p className="eventos-lista-detail">{event.detail}</p>
                )}

                {event.hasTooltip && event.tooltip && (
                  <p className="eventos-lista-tooltip-text">{event.tooltip}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
