import React from 'react';
import AccordionBlock from './AccordionBlock';
import { PREDICCIONES_TITLES } from '../../constants/prediccionesSectionTitles';
import { IconJugadoresImportantes } from './PrediccionesIcons';

function PlayerRow({ player, meta, compact = false }) {
  if (!player) {
    return null;
  }

  return (
    <li className={`predicciones-jugadores-row${compact ? ' predicciones-jugadores-row--compact' : ''}`}>
      {player.photo ? (
        <img src={player.photo} alt="" className="predicciones-jugadores-row__photo" loading="lazy" />
      ) : (
        <span className="predicciones-jugadores-row__photo predicciones-jugadores-row__photo--fallback" aria-hidden="true">
          {player.name?.charAt(0) || '?'}
        </span>
      )}
      <div className="predicciones-jugadores-row__info">
        <span className="predicciones-jugadores-row__name">{player.name}</span>
        {meta ? <span className="predicciones-jugadores-row__meta">{meta}</span> : null}
      </div>
    </li>
  );
}

function TeamSection({ team }) {
  if (!team?.hasData) {
    return (
      <article className="predicciones-jugadores-team">
        <h4 className="predicciones-jugadores-team__title">{team.teamName}</h4>
        <p className="predicciones-jugadores-empty">Sin datos de jugadores disponibles.</p>
      </article>
    );
  }

  return (
    <article className="predicciones-jugadores-team">
      <h4 className="predicciones-jugadores-team__title">{team.teamName}</h4>

      {team.topShooters.length > 0 && (
        <section className="predicciones-jugadores-subsection">
          <h5 className="predicciones-jugadores-subsection__title">Más tiros al arco</h5>
          <ul className="predicciones-jugadores-list">
            {team.topShooters.map((player) => (
              <PlayerRow
                key={`shots-${player.id}`}
                player={player}
                meta={`${player.shots.total} tiros · ${player.shots.on} a puerta · ${player.shots.off} fuera`}
                compact
              />
            ))}
          </ul>
        </section>
      )}

      {team.topParticipation.length > 0 && (
        <section className="predicciones-jugadores-subsection">
          <h5 className="predicciones-jugadores-subsection__title">Mayor participación ofensiva</h5>
          <ul className="predicciones-jugadores-list">
            {team.topParticipation.map((player) => (
              <PlayerRow
                key={`part-${player.id}`}
                player={player}
                meta={[
                  `${player.passes.total} pases`,
                  `${player.passes.key} clave`,
                  `${player.dribbles.attempts} regates`,
                  `${player.duels.won}/${player.duels.total} duelos`,
                  player.touches != null ? `${player.touches} toques` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                compact
              />
            ))}
          </ul>
        </section>
      )}

      {team.startingGoalkeeper && (
        <section className="predicciones-jugadores-subsection">
          <h5 className="predicciones-jugadores-subsection__title">Portero titular</h5>
          <ul className="predicciones-jugadores-list">
            <PlayerRow
              player={team.startingGoalkeeper}
              meta={`${team.startingGoalkeeper.saves} atajadas`}
              compact
            />
          </ul>
        </section>
      )}

      {team.otherHighlights.length > 0 && (
        <section className="predicciones-jugadores-subsection">
          <h5 className="predicciones-jugadores-subsection__title">Otros datos relevantes</h5>
          <ul className="predicciones-jugadores-list">
            {team.otherHighlights.map((player) => (
              <PlayerRow key={`other-${player.id}`} player={player} meta={player.highlight} compact />
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

export default function JugadoresImportantesPartido({ data, nombreEquipoA, nombreEquipoB }) {
  if (!data?.available) {
    return null;
  }

  const equipoA = { ...data.equipoA, teamName: nombreEquipoA || data.equipoA?.teamName };
  const equipoB = { ...data.equipoB, teamName: nombreEquipoB || data.equipoB?.teamName };

  return (
    <AccordionBlock
      className="predicciones-jugadores-accordion"
      title={PREDICCIONES_TITLES.jugadoresImportantesPartido}
      icon={<IconJugadoresImportantes size={18} />}
      defaultOpenDesktop
      defaultOpenMobile={false}
    >
      <p className="predicciones-jugadores-source">
        {data.source === 'fixture'
          ? 'Estadísticas del partido (fixtures/players + fixtures/statistics).'
          : 'Estadísticas de temporada por jugador (el partido aún no tiene datos en vivo).'}
      </p>

      <div className="predicciones-jugadores-grid">
        <TeamSection team={equipoA} />
        <TeamSection team={equipoB} />
      </div>
    </AccordionBlock>
  );
}
