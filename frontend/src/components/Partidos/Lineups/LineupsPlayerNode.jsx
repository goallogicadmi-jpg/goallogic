import { useState } from 'react';

/**
 * Jugador sobre la cancha (foto API o placeholder con inicial).
 */
export default function LineupsPlayerNode({
  player,
  teamColors,
  onClick,
  compact = false,
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const isGoalkeeper = ['G', 'GK'].includes((player.position || '').toUpperCase());
  const jerseyColor = isGoalkeeper ? teamColors.gkPrimary : teamColors.primary;
  const showPhoto = Boolean(player.photo) && !photoFailed;
  const displayName = player.shortName || player.name || 'Jugador';
  const initial = (player.name || '?').trim().charAt(0).toUpperCase();

  const handleClick = () => {
    if (onClick && player.id) onClick(player);
  };

  return (
    <button
      type="button"
      className={`lineups-player${compact ? ' lineups-player--compact' : ''}`}
      style={{
        left: `${player.pitchX}%`,
        top: `${player.pitchY}%`,
        '--lineups-jersey': jerseyColor,
        '--lineups-jersey-number': teamColors.number,
        '--lineups-jersey-border': teamColors.border,
      }}
      onClick={handleClick}
      title={player.name}
    >
      <span className="lineups-player__avatar" aria-hidden="true">
        {showPhoto ? (
          <img
            src={player.photo}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <span className="lineups-player__placeholder">{initial}</span>
        )}
        <span className="lineups-player__badge">{player.number}</span>
      </span>
      {!compact && <span className="lineups-player__name">{displayName}</span>}
    </button>
  );
}
