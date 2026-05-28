import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import usePlayerStats from '../../../hooks/usePlayerStats';
import usePlayerHeatmap from '../../../hooks/usePlayerHeatmap';
import PlayerHeatmap from './PlayerHeatmap';
import { translatePlayerPosition } from '../../../utils/playerFixtureStats';
import '../../../styles/playerStatsModal.css';

/**
 * Modal de estadísticas del jugador en el partido actual.
 */
export default function PlayerStatsModal({ player, fixtureId, onClose, onStartCompare }) {
  const [photoFailed, setPhotoFailed] = useState(false);

  const {
    loading,
    error,
    hasStats,
    player: apiPlayer,
    statCards,
    team,
    refetch,
  } = usePlayerStats(fixtureId, player?.id, {
    enabled: Boolean(fixtureId && player?.id),
    lineupPlayer: player,
  });

  const {
    loading: heatmapLoading,
    error: heatmapError,
    points: heatmapPoints,
    hasData: hasHeatmapData,
    refetch: refetchHeatmap,
  } = usePlayerHeatmap(fixtureId, player?.id, {
    enabled: Boolean(fixtureId && player?.id),
  });

  const display = apiPlayer || player;
  const showPhoto = Boolean(display?.photo) && !photoFailed;
  const initial = (display?.name || '?').trim().charAt(0).toUpperCase();

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="player-stats-modal__overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="player-stats-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-stats-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="player-stats-modal__header">
          <h2 id="player-stats-modal-title" className="player-stats-modal__title">
            Estadísticas del partido
          </h2>
          <div className="player-stats-modal__header-actions">
            {onStartCompare && (
              <button
                type="button"
                className="player-stats-modal__compare-btn"
                onClick={() => onStartCompare(player)}
              >
                Comparar jugador
              </button>
            )}
            <button
              type="button"
              className="player-stats-modal__close"
              onClick={onClose}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </header>

        <div className="player-stats-modal__body">
          <div className="player-stats-modal__hero">
            <div className="player-stats-modal__photo-wrap">
              {showPhoto ? (
                <img
                  src={display.photo}
                  alt=""
                  className="player-stats-modal__photo"
                  loading="lazy"
                  onError={() => setPhotoFailed(true)}
                />
              ) : (
                <span className="player-stats-modal__photo-placeholder">{initial}</span>
              )}
            </div>

            <div className="player-stats-modal__identity">
              <p className="player-stats-modal__name">{display?.name}</p>
              {team?.name && (
                <p className="player-stats-modal__team">{team.name}</p>
              )}
              <ul className="player-stats-modal__meta">
                {display?.number != null && (
                  <li>
                    <span className="player-stats-modal__meta-label">Dorsal</span>
                    <span>{display.number}</span>
                  </li>
                )}
                {display?.position && (
                  <li>
                    <span className="player-stats-modal__meta-label">Posición</span>
                    <span>{translatePlayerPosition(display.position)}</span>
                  </li>
                )}
                {display?.nationality && (
                  <li>
                    <span className="player-stats-modal__meta-label">Nacionalidad</span>
                    <span>{display.nationality}</span>
                  </li>
                )}
                {display?.age != null && (
                  <li>
                    <span className="player-stats-modal__meta-label">Edad</span>
                    <span>{display.age} años</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {loading && (
            <p className="player-stats-modal__status">Cargando estadísticas…</p>
          )}

          {error && !loading && (
            <div className="player-stats-modal__status player-stats-modal__status--error">
              <p>{error}</p>
              <button type="button" className="lineups-retry-btn" onClick={refetch}>
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && hasStats && (
            <section className="player-stats-modal__section" aria-label="Estadísticas del partido">
              <h3 className="player-stats-modal__section-title">En este partido</h3>
              <div className="player-stats-modal__grid">
                {statCards.map((card) => (
                  <div key={card.key} className="player-stats-modal__stat-card">
                    <span className="player-stats-modal__stat-label">{card.label}</span>
                    <span className="player-stats-modal__stat-value">{card.value}</span>
                    {card.hint && (
                      <span className="player-stats-modal__stat-hint">{card.hint}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {!loading && !error && !hasStats && (
            <p className="player-stats-modal__empty">
              Sin estadísticas registradas en este partido
            </p>
          )}

          <section className="player-stats-modal__section" aria-label="Mapa de calor">
            <h3 className="player-stats-modal__section-title">Mapa de calor</h3>

            {heatmapLoading && (
              <p className="player-stats-modal__status player-stats-modal__heatmap-loading">
                Cargando mapa de calor…
              </p>
            )}

            {heatmapError && !heatmapLoading && (
              <div className="player-stats-modal__status player-stats-modal__status--error">
                <p>{heatmapError}</p>
                <button type="button" className="lineups-retry-btn" onClick={refetchHeatmap}>
                  Reintentar
                </button>
              </div>
            )}

            {!heatmapLoading && !heatmapError && hasHeatmapData && (
              <PlayerHeatmap points={heatmapPoints} />
            )}

            {!heatmapLoading && !heatmapError && !hasHeatmapData && (
              <p className="player-stats-modal__empty player-stats-modal__heatmap-empty">
                Sin datos de mapa de calor para este jugador
              </p>
            )}
          </section>

          <section className="player-stats-modal__section player-stats-modal__section--placeholder">
            <h3 className="player-stats-modal__section-title">Últimos partidos</h3>
            <p className="player-stats-modal__placeholder">
              Próximamente: historial reciente del jugador en la competición.
            </p>
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}
