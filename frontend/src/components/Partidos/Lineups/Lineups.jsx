import { useState } from 'react';
import useMatchLineups from '../../../hooks/useMatchLineups';
import LineupsTeamBlock from './LineupsTeamBlock';
import PlayerModal from '../PlayerModal';
import '../../../styles/lineups.css';

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

  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const handlePlayerClick = (player) => {
    if (player?.id) {
      setSelectedPlayer({ id: player.id, name: player.name });
    }
  };

  if (loading) {
    return (
      <div className="lineups lineups--loading">
        <p>Cargando alineaciones…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lineups lineups--error">
        <p>{error}</p>
        <button type="button" className="lineups-retry-btn" onClick={refetch}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!hasLineups || (!home?.starters?.length && !away?.starters?.length)) {
    return (
      <div className="lineups lineups--empty">
        <p>Alineaciones aún no disponibles</p>
        <p className="lineups--empty-hint">
          Se publican habitualmente poco antes del inicio del partido.
        </p>
      </div>
    );
  }

  return (
    <div className="lineups">
      <div className="lineups__grid">
        {home && (
          <LineupsTeamBlock
            team={home}
            side="home"
            onTeamClick={onTeamClick}
            onPlayerClick={handlePlayerClick}
          />
        )}
        {away && (
          <LineupsTeamBlock
            team={away}
            side="away"
            onTeamClick={onTeamClick}
            onPlayerClick={handlePlayerClick}
          />
        )}
      </div>

      {selectedPlayer && (
        <PlayerModal
          playerId={selectedPlayer.id}
          playerName={selectedPlayer.name}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}
