import { useMemo } from 'react';
import useMatchTimeline from '../../../hooks/useMatchTimeline';
import useMediaQuery from '../../../hooks/useMediaQuery';
import { getTimelineMaxMinute } from '../../../utils/matchEvents';
import {
  buildMatchMomentumFromTimeline,
  buildMobileMomentumAxisMarks,
} from '../../../utils/matchMomentum';
import '../../../styles/matchMomentum.css';

/**
 * Gráfico estilo "Momento del partido" para la pestaña Cronología.
 * @param {{ timeline?: ReturnType<typeof useMatchTimeline> }} props
 */
export default function MatchMomentumChart({ fixtureId, partido, timeline: timelineProp }) {
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
    refetch,
  } = timeline;
  const homeName = partido?.teams?.home?.name || 'Local';
  const awayName = partido?.teams?.away?.name || 'Visitante';

  const isCompactMobile = useMediaQuery('(max-width: 480px)');
  const isUltraCompactMobile = useMediaQuery('(max-width: 360px)');

  const maxMinute = useMemo(
    () => getTimelineMaxMinute(timelineEvents),
    [timelineEvents]
  );

  const momentum = useMemo(
    () => buildMatchMomentumFromTimeline(timelineEvents, {
      chartMaxMinute: maxMinute,
      homeColor: partido?.teams?.home?.colors?.primary || '#1565c0',
      awayColor: partido?.teams?.away?.colors?.primary || '#c62828',
    }),
    [timelineEvents, maxMinute, partido?.teams?.home?.colors?.primary, partido?.teams?.away?.colors?.primary]
  );

  const axisMarks = useMemo(
    () => {
      if (isUltraCompactMobile) {
        return buildMobileMomentumAxisMarks(momentum.chartMaxMinute, { ultraCompact: true });
      }
      if (isCompactMobile) {
        return buildMobileMomentumAxisMarks(momentum.chartMaxMinute);
      }
      return momentum.axisMarks;
    },
    [isUltraCompactMobile, isCompactMobile, momentum.axisMarks, momentum.chartMaxMinute]
  );

  if (loading) {
    return (
      <div className="match-momentum match-momentum--loading">
        <p>Cargando cronología del partido…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="match-momentum match-momentum--error">
        <p>{error}</p>
        <button type="button" className="lineups-retry-btn" onClick={refetch}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div
      className={[
        'match-momentum',
        isCompactMobile ? 'match-momentum--compact' : '',
        isUltraCompactMobile ? 'match-momentum--ultra-compact' : '',
      ].filter(Boolean).join(' ')}
    >
      <header className="match-momentum__header">
        <div>
          <h3 className="match-momentum__title">Momento del partido</h3>
          <p className="match-momentum__subtitle">
            Dominio estimado por tramos de {momentum.segmentMinutes} minutos según eventos clave.
          </p>
        </div>
        {isLive && !isFinished && (
          <span className="match-momentum__live-badge" aria-label="Partido en vivo">
            EN VIVO
          </span>
        )}
      </header>

      <div className="match-momentum__teams">
        <span className="match-momentum__team" style={{ '--team-color': momentum.homeColor }}>
          {partido?.teams?.home?.logo && (
            <img src={partido.teams.home.logo} alt="" className="match-momentum__team-logo" />
          )}
          {homeName}
        </span>
        <span className="match-momentum__team match-momentum__team--away" style={{ '--team-color': momentum.awayColor }}>
          {awayName}
          {partido?.teams?.away?.logo && (
            <img src={partido.teams.away.logo} alt="" className="match-momentum__team-logo" />
          )}
        </span>
      </div>

      <div
        className="match-momentum__chart"
        style={{
          '--momentum-home-color': momentum.homeColor,
          '--momentum-away-color': momentum.awayColor,
        }}
      >
        <div className="match-momentum__goals-row" aria-hidden={momentum.goalMarkers.length === 0}>
          {momentum.goalMarkers.map((goal) => (
            <span
              key={goal.id}
              className={`match-momentum__goal-icon match-momentum__goal-icon--${goal.side}`}
              style={{
                left: `${goal.leftPercent}%`,
                '--goal-color': goal.teamColor,
                top: `${(goal.verticalOffset || 0) + (goal.side === 'away' ? (isCompactMobile ? 11 : 10) : 0)}px`,
              }}
              title={`${goal.minuteLabel}' ${goal.playerName || 'Gol'}`}
            >
              {goal.icon}
            </span>
          ))}
        </div>

        <div className="match-momentum__bars-wrap">
          <div
            className="match-momentum__bars"
            style={{ gridTemplateColumns: `repeat(${momentum.bars.length}, minmax(0, 1fr))` }}
          >
            {momentum.bars.map((bar) => (
              <div key={bar.index} className="match-momentum__bar-col" aria-hidden="true">
                {bar.side === 'home' && (
                  <div
                    className="match-momentum__bar match-momentum__bar--home"
                    style={{ height: `${bar.heightPercent}%` }}
                  />
                )}
                {bar.side === 'away' && (
                  <div
                    className="match-momentum__bar match-momentum__bar--away"
                    style={{ height: `${bar.heightPercent}%` }}
                  />
                )}
              </div>
            ))}
            <div className="match-momentum__center-line" />
          </div>
        </div>

        <div className="match-momentum__axis">
          {axisMarks.map((mark) => (
            <span
              key={`${mark.minute}-${mark.label}`}
              className="match-momentum__axis-mark"
              style={{ left: `${(mark.minute / momentum.chartMaxMinute) * 100}%` }}
            >
              {mark.label}
            </span>
          ))}
        </div>
      </div>

      {timelineEvents.length === 0 && (
        <p className="match-momentum__empty-note">
          Aún no hay eventos registrados para estimar el momentum del partido.
        </p>
      )}
    </div>
  );
}
