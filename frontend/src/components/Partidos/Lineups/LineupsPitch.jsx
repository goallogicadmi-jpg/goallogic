import LineupsPlayerNode from './LineupsPlayerNode';

/**
 * Cancha 2D con jugadores titulares posicionados.
 */
export default function LineupsPitch({
  team,
  side = 'home',
  onPlayerClick,
  compact = false,
}) {
  if (!team) return null;

  return (
    <div
      className={`lineups-pitch lineups-pitch--${side}`}
      role="img"
      aria-label={`Cancha ${team.name}, formación ${team.formation}`}
    >
      <svg className="lineups-pitch__marks" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
        <rect x="2" y="2" width="96" height="136" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
        <line x1="2" y1="70" x2="98" y2="70" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
        <circle cx="50" cy="70" r="10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <rect x="28" y="2" width="44" height="16" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        <rect x="28" y="122" width="44" height="16" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
      </svg>

      <div className="lineups-pitch__players">
        {team.starters.map((player) => (
          <LineupsPlayerNode
            key={player.id}
            player={player}
            teamColors={team.colors}
            onClick={onPlayerClick}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}
