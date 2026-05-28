import { useState } from 'react';
import useMatchLineups from '../../../hooks/useMatchLineups';
import useMatchEvents from '../../../hooks/useMatchEvents';
import usePlayerCompare from '../../../hooks/usePlayerCompare';
import LineupsTeamBlock from './LineupsTeamBlock';
import LineupsSubstitutions from './LineupsSubstitutions';
import LineupsLiveEventToast from './LineupsLiveEventToast';
import PlayerStatsModal from './PlayerStatsModal';
import PlayerCompareModal from './PlayerCompareModal';
import '../../../styles/lineups.css';
import '../../../styles/playerCompareModal.css';

/**
 * Módulo de alineaciones tácticas (vista tipo ESPN / SofaScore).
 * Estructura lista para integrar datos de API vía useMatchLineups.
 *
 * @param {number|string} fixtureId
 * @param {Object} partido
 * @param {Function} [onTeamClick]
 * @param {boolean} [useMock] - Solo desarrollo: datos de ejemplo sin API
 */
export default function Lineups({ fixtureId, partido, onTeamClick, useMock = false }) {
  const { loading, error, home, away, hasLineups, refetch } = useMatchLineups(
    fixtureId,
    partido,
    {
      enabled: useMock || Boolean(fixtureId),
      useMock,
    }
  );

  const {
    loading: eventsLoading,
    error: eventsError,
    substitutionsHome,
    substitutionsAway,
    isLive,
    isFinished,
    newSubstitutionIds,
    newPlayerEventIds,
    eventsByPlayer,
    animateEventByPlayer,
    liveEventToasts,
    clearNewFlag,
    clearNewPlayerEventFlag,
    refetch: refetchEvents,
  } = useMatchEvents(fixtureId, partido, {
    enabled: !useMock && Boolean(fixtureId),
  });

  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const {
    playerA: comparePlayerA,
    playerB: comparePlayerB,
    isSelectingSecondPlayer,
    showCompareModal,
    startCompare,
    selectPlayerB,
    changePlayerB,
    resetCompare,
    cancelSelection,
  } = usePlayerCompare(fixtureId);

  const handlePlayerClick = (player) => {
    if (!player?.id) return;

    if (isSelectingSecondPlayer) {
      if (selectPlayerB(player)) {
        setSelectedPlayer(null);
      }
      return;
    }

    setSelectedPlayer(player);
  };

  const handleStartCompare = (player) => {
    startCompare(player);
    setSelectedPlayer(null);
  };

  const homeDisplay = home || (partido?.teams?.home ? {
    name: partido.teams.home.name,
    logo: partido.teams.home.logo,
    colors: { primary: '#1565c0', number: '#fff', border: '#0d3d18', gkPrimary: '#f59e0b' },
  } : null);

  const awayDisplay = away || (partido?.teams?.away ? {
    name: partido.teams.away.name,
    logo: partido.teams.away.logo,
    colors: { primary: '#c62828', number: '#fff', border: '#0d3d18', gkPrimary: '#f59e0b' },
  } : null);

  return (
    <div className={`lineups${isSelectingSecondPlayer ? ' lineups--compare-selecting' : ''}`}>
      {isSelectingSecondPlayer && comparePlayerA && (
        <div className="lineups-compare-banner" role="status">
          <span>
            Toca otro jugador para comparar con {comparePlayerA.name || 'Jugador A'}
          </span>
          <button
            type="button"
            className="lineups-compare-banner__cancel"
            onClick={cancelSelection}
          >
            Cancelar
          </button>
        </div>
      )}

      {loading && !hasLineups && (
        <p className="lineups__status lineups__status--loading">Cargando alineaciones…</p>
      )}

      {error && !hasLineups && (
        <div className="lineups lineups--error lineups__status">
          <p>{error}</p>
          <button type="button" className="lineups-retry-btn" onClick={refetch}>
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && !hasLineups && (
        <div className="lineups lineups--empty lineups__status">
          <p>Alineaciones aún no disponibles</p>
          <p className="lineups--empty-hint">
            Se publican habitualmente poco antes del inicio del partido.
          </p>
        </div>
      )}

      <div className="lineups__grid">
        {home && (
          <LineupsTeamBlock
            team={home}
            side="home"
            onTeamClick={onTeamClick}
            onPlayerClick={handlePlayerClick}
            eventsByPlayer={eventsByPlayer}
            newPlayerEventIds={newPlayerEventIds}
            onPlayerEventAnimated={clearNewPlayerEventFlag}
            animateEventByPlayer={animateEventByPlayer}
            isSelectingSecondPlayer={isSelectingSecondPlayer}
            comparePlayerAId={comparePlayerA?.id}
          />
        )}
        {away && (
          <LineupsTeamBlock
            team={away}
            side="away"
            onTeamClick={onTeamClick}
            onPlayerClick={handlePlayerClick}
            eventsByPlayer={eventsByPlayer}
            newPlayerEventIds={newPlayerEventIds}
            onPlayerEventAnimated={clearNewPlayerEventFlag}
            animateEventByPlayer={animateEventByPlayer}
            isSelectingSecondPlayer={isSelectingSecondPlayer}
            comparePlayerAId={comparePlayerA?.id}
          />
        )}
      </div>

      {!useMock && isLive && !isFinished && (
        <LineupsLiveEventToast toasts={liveEventToasts} />
      )}

      {!useMock && fixtureId && (
        <LineupsSubstitutions
          homeTeam={homeDisplay}
          awayTeam={awayDisplay}
          substitutionsHome={substitutionsHome}
          substitutionsAway={substitutionsAway}
          loading={eventsLoading}
          error={eventsError}
          isLive={isLive}
          isFinished={isFinished}
          newSubstitutionIds={newSubstitutionIds}
          onSubAnimated={clearNewFlag}
          onRetry={refetchEvents}
        />
      )}

      {selectedPlayer && fixtureId && !useMock && !showCompareModal && (
        <PlayerStatsModal
          player={selectedPlayer}
          fixtureId={fixtureId}
          onClose={() => setSelectedPlayer(null)}
          onStartCompare={handleStartCompare}
        />
      )}

      {showCompareModal && comparePlayerA && comparePlayerB && fixtureId && !useMock && (
        <PlayerCompareModal
          playerA={comparePlayerA}
          playerB={comparePlayerB}
          fixtureId={fixtureId}
          eventsByPlayer={eventsByPlayer}
          onClose={resetCompare}
          onChangePlayerB={() => {
            changePlayerB();
            setSelectedPlayer(null);
          }}
        />
      )}
    </div>
  );
}
