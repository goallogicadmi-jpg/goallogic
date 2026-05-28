import { getEventAnimationClass } from '../../../utils/matchEvents';

/**
 * Animación temporal sobre el jugador cuando ocurre un evento en vivo.
 */
export default function LineupsPlayerEventAnimation({ kind, compact = false }) {
  if (!kind) return null;

  const animClass = getEventAnimationClass(kind);
  const showInjuryIcon = kind === 'injury';
  const showPenaltyMissIcon = kind === 'penalty_missed';

  return (
    <span
      className={`lineups-player-event-anim ${animClass}${compact ? ' lineups-player-event-anim--compact' : ''}`}
      aria-hidden="true"
    >
      {showInjuryIcon && (
        <span className="lineups-player-event-anim__icon lineups-player-event-anim__icon--injury">
          ✚
        </span>
      )}
      {showPenaltyMissIcon && (
        <span className="lineups-player-event-anim__icon lineups-player-event-anim__icon--miss">
          ✖
        </span>
      )}
    </span>
  );
}
