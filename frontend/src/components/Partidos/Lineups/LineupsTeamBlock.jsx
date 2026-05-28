import LineupsPitch from './LineupsPitch';
import LineupsBenchPlayer from './LineupsBenchPlayer';

/**
 * Bloque de un equipo: cabecera, formación, cancha y banquillo.
 */
export default function LineupsTeamBlock({
  team,
  side = 'home',
  onTeamClick,
  onPlayerClick,
  compactPitch = false,
}) {
  if (!team) return null;

  return (
    <article className={`lineups-team lineups-team--${side}`}>
      <header
        className="lineups-team__header"
        style={{
          '--lineups-team-primary': team.colors.primary,
          '--lineups-team-border': team.colors.border,
        }}
      >
        <div className="lineups-team__identity">
          {team.logo ? (
            <img src={team.logo} alt="" className="lineups-team__logo" loading="lazy" decoding="async" />
          ) : (
            <span className="lineups-team__logo-placeholder" aria-hidden="true" />
          )}
          <div className="lineups-team__titles">
            {onTeamClick ? (
              <button type="button" className="lineups-team__name-btn" onClick={() => onTeamClick(team.teamId)}>
                {team.name}
              </button>
            ) : (
              <h3 className="lineups-team__name">{team.name}</h3>
            )}
            <p className="lineups-team__formation">{team.formation}</p>
            {team.coach?.name && (
              <p className="lineups-team__coach">
                {team.coach.photo ? (
                  <img
                    src={team.coach.photo}
                    alt=""
                    className="lineups-team__coach-photo"
                    loading="lazy"
                  />
                ) : null}
                DT: {team.coach.name}
              </p>
            )}
          </div>
        </div>
        <span className="lineups-team__color-chip" aria-hidden="true" />
      </header>

      <LineupsPitch
        team={team}
        side={side}
        onPlayerClick={onPlayerClick}
        compact={compactPitch}
        startersCount={team.starters?.length || 0}
      />

      {team.substitutes?.length > 0 && (
        <section className="lineups-bench" aria-label={`Suplentes ${team.name}`}>
          <h4 className="lineups-bench__title">Suplentes</h4>
          <ul className="lineups-bench__list">
            {team.substitutes.map((player) => (
              <li key={player.id}>
                <LineupsBenchPlayer
                  player={player}
                  teamColors={team.colors}
                  onClick={onPlayerClick}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
