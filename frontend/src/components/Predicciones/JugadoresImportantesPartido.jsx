import React, { useCallback, useEffect, useRef, useState } from 'react';
import AccordionBlock from './AccordionBlock';
import AccordionPremiumLoader from './AccordionPremiumLoader';
import { PREDICCIONES_TITLES } from '../../constants/prediccionesSectionTitles';
import { IconJugadoresImportantes } from './PrediccionesIcons';
import { getFixturePlayers, getFixtureStatistics, getTeamPlayersStats } from '../../api/api';
import { buildImportantPlayersViewModel } from '../../utils/prediccionesImportantPlayers';

const INITIAL_STATE = {
  status: 'idle',
  data: null,
  error: null,
};

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

export default function JugadoresImportantesPartido({ lazyContext, nombreEquipoA, nombreEquipoB }) {
  const [fetchState, setFetchState] = useState(INITIAL_STATE);
  const loadedRef = useRef(false);
  const loadingRef = useRef(false);
  const cacheRef = useRef(null);

  const contextKey = lazyContext
    ? `${lazyContext.equipoAId}-${lazyContext.equipoBId}-${lazyContext.fixtureId ?? 'none'}-${lazyContext.seasonA}-${lazyContext.seasonB}`
    : null;

  useEffect(() => {
    loadedRef.current = false;
    loadingRef.current = false;
    cacheRef.current = null;
    setFetchState(INITIAL_STATE);
  }, [contextKey]);

  const loadJugadores = useCallback(async () => {
    if (!lazyContext || loadedRef.current || loadingRef.current) {
      return;
    }

    if (cacheRef.current) {
      loadedRef.current = true;
      setFetchState({ status: 'loaded', data: cacheRef.current, error: null });
      return;
    }

    const { prefetch } = lazyContext;

    if (prefetch && !prefetch.ready) {
      setFetchState((prev) => ({ ...prev, status: 'loading', error: null }));
      return;
    }

    loadingRef.current = true;
    setFetchState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const {
        equipoAId,
        equipoBId,
        ligaA,
        ligaB,
        seasonA,
        seasonB,
        fixtureId,
        nombreEquipoA: teamAName,
        nombreEquipoB: teamBName,
        prefetch,
      } = lazyContext;

      const fetchPlayersStatsA = () =>
        getTeamPlayersStats(equipoAId, ligaA, seasonA).catch((err) => {
          console.warn('⚠️ Error obteniendo estadísticas de jugadores equipo A:', err);
          return { response: [] };
        });

      const fetchPlayersStatsB = () =>
        getTeamPlayersStats(equipoBId, ligaB, seasonB).catch((err) => {
          console.warn('⚠️ Error obteniendo estadísticas de jugadores equipo B:', err);
          return { response: [] };
        });

      const [playersStatsA, playersStatsB, fixtureTeamStatistics, fixturePlayerStats] = await Promise.all([
        prefetch?.ready && prefetch?.playersStatsA
          ? Promise.resolve(prefetch.playersStatsA)
          : fetchPlayersStatsA(),
        prefetch?.ready && prefetch?.playersStatsB
          ? Promise.resolve(prefetch.playersStatsB)
          : fetchPlayersStatsB(),
        fixtureId
          ? getFixtureStatistics(fixtureId).catch((err) => {
              console.warn('⚠️ Error obteniendo estadísticas del fixture:', err);
              return null;
            })
          : Promise.resolve(null),
        fixtureId
          ? getFixturePlayers(fixtureId).catch((err) => {
              console.warn('⚠️ Error obteniendo jugadores del fixture:', err);
              return null;
            })
          : Promise.resolve(null),
      ]);

      const data = buildImportantPlayersViewModel({
        fixturePlayersResponse: fixturePlayerStats,
        seasonPlayersResponseA: playersStatsA,
        seasonPlayersResponseB: playersStatsB,
        fixtureStatisticsResponse: fixtureTeamStatistics,
        teamAId: equipoAId,
        teamBId: equipoBId,
        teamAName: teamAName,
        teamBName: teamBName,
      });

      cacheRef.current = data;
      loadedRef.current = true;
      setFetchState({ status: 'loaded', data, error: null });
    } catch (err) {
      setFetchState({
        status: 'error',
        data: null,
        error: err?.message || 'No se pudieron cargar los jugadores importantes.',
      });
    } finally {
      loadingRef.current = false;
    }
  }, [lazyContext]);

  useEffect(() => {
    if (fetchState.status !== 'loading' || lazyContext?.prefetch?.ready !== true) {
      return;
    }
    if (!loadedRef.current && !loadingRef.current) {
      loadJugadores();
    }
  }, [lazyContext?.prefetch?.ready, fetchState.status, loadJugadores]);

  const handleOpenChange = useCallback(
    (isOpen) => {
      if (isOpen) {
        loadJugadores();
      }
    },
    [loadJugadores]
  );

  if (!lazyContext) {
    return null;
  }

  const nombreA = nombreEquipoA || lazyContext.nombreEquipoA || 'Equipo A';
  const nombreB = nombreEquipoB || lazyContext.nombreEquipoB || 'Equipo B';
  const { status, data, error } = fetchState;

  return (
    <AccordionBlock
      className="predicciones-jugadores-accordion"
      title={PREDICCIONES_TITLES.jugadoresImportantesPartido}
      icon={<IconJugadoresImportantes size={18} />}
      defaultOpenDesktop={false}
      defaultOpenMobile={false}
      onOpenChange={handleOpenChange}
    >
      {status === 'loading' && <AccordionPremiumLoader message="Cargando jugadores importantes…" />}

      {status === 'error' && (
        <p className="predicciones-accordion-error" role="alert">
          {error}
        </p>
      )}

      {status === 'loaded' && data && (
        <>
          {!data.available ? (
            <p className="predicciones-jugadores-empty">Sin datos de jugadores disponibles para este partido.</p>
          ) : (
            <>
              <p className="predicciones-jugadores-source">
                {data.source === 'fixture'
                  ? 'Estadísticas del partido (fixtures/players + fixtures/statistics).'
                  : 'Estadísticas de temporada por jugador (el partido aún no tiene datos en vivo).'}
              </p>

              <div className="predicciones-jugadores-grid">
                <TeamSection team={{ ...data.equipoA, teamName: nombreA }} />
                <TeamSection team={{ ...data.equipoB, teamName: nombreB }} />
              </div>
            </>
          )}
        </>
      )}
    </AccordionBlock>
  );
}
