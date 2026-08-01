import { useMemo } from 'react';
import { buildMiniMomentumData } from '../../utils/matchCardHelpers';

/**
 * Gráfico de momentum reducido para tarjetas del feed.
 * @param {{ timelineEvents: Array, partido: Object }} props
 */
export default function PartidoCardMiniMomentum({ timelineEvents, partido }) {
  const momentum = useMemo(
    () => buildMiniMomentumData(timelineEvents, partido),
    [timelineEvents, partido]
  );

  if (!momentum?.bars?.length) {
    return null;
  }

  return (
    <div
      className="partido-card-mini-momentum"
      aria-hidden="true"
      style={{
        '--mini-home-color': momentum.homeColor,
        '--mini-away-color': momentum.awayColor,
      }}
    >
      <div
        className="partido-card-mini-momentum__bars"
        style={{ gridTemplateColumns: `repeat(${momentum.bars.length}, minmax(0, 1fr))` }}
      >
        {momentum.bars.map((bar) => (
          <div key={bar.index} className="partido-card-mini-momentum__col">
            {bar.side === 'home' && (
              <div
                className="partido-card-mini-momentum__bar partido-card-mini-momentum__bar--home"
                style={{ height: `${bar.heightPercent}%` }}
              />
            )}
            {bar.side === 'away' && (
              <div
                className="partido-card-mini-momentum__bar partido-card-mini-momentum__bar--away"
                style={{ height: `${bar.heightPercent}%` }}
              />
            )}
          </div>
        ))}
        <div className="partido-card-mini-momentum__midline" />
        {momentum.goalMarkers.map((goal) => (
          <span
            key={goal.id}
            className={`partido-card-mini-momentum__goal partido-card-mini-momentum__goal--${goal.side}`}
            style={{
              left: `${goal.leftPercent}%`,
              '--goal-color': goal.teamColor,
            }}
          />
        ))}
      </div>
    </div>
  );
}
