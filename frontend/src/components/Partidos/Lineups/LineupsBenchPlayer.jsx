import { useState } from 'react';

/**
 * Fila de suplente en el banquillo.
 */
export default function LineupsBenchPlayer({
  player,
  teamColors,
  onClick,
  isSelectingSecondPlayer = false,
  comparePlayerAId = null,
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(player.photo) && !photoFailed;
  const initial = (player.name || '?').trim().charAt(0).toUpperCase();

  const isSelf = comparePlayerAId != null && String(player.id) === String(comparePlayerAId);
  const compareClass = isSelectingSecondPlayer
    ? isSelf
      ? ' lineups-bench__player--compare-disabled'
      : ' lineups-bench__player--compare-selectable'
    : '';

  const handleClick = () => {
    if (isSelectingSecondPlayer && isSelf) return;
    onClick?.(player);
  };

  return (
    <button
      type="button"
      className={`lineups-bench__player${compareClass}`}
      onClick={handleClick}
    >
      <span
        className="lineups-bench__avatar"
        style={{ backgroundColor: teamColors.primary, color: teamColors.number }}
      >
        {showPhoto ? (
          <img
            src={player.photo}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          initial
        )}
      </span>
      <span className="lineups-bench__number">{player.number}</span>
      <span className="lineups-bench__name">{player.shortName || player.name}</span>
    </button>
  );
}
