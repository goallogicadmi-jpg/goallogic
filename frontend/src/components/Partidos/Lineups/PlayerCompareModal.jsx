import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import usePlayerStats from '../../../hooks/usePlayerStats';
import usePlayerHeatmap from '../../../hooks/usePlayerHeatmap';
import PlayerHeatmap from './PlayerHeatmap';
import { translatePlayerPosition } from '../../../utils/playerFixtureStats';
import {
  buildCompareMetricRows,
  getSideCompareClass,
} from '../../../utils/playerCompare';
import '../../../styles/playerCompareModal.css';

const EVENT_ICONS = {
  goal: '⚽',
  goal_own: '🥅',
  goal_penalty: '⚽',
  penalty_missed: '⨯',
  card_yellow: '🟨',
  card_red: '🟥',
  card_second_yellow: '🟨🟥',
  injury: '✚',
  var: '🖥️',
};

function PlayerPhoto({ player, label }) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(player?.photo) && !failed;
  const initial = (player?.name || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="player-compare-panel__hero">
      <span className="player-compare-panel__badge">{label}</span>
      <div className="player-compare-panel__photo-wrap">
        {showPhoto ? (
          <img
            src={player.photo}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="player-compare-panel__photo-placeholder">{initial}</span>
        )}
      </div>
      <p className="player-compare-panel__name">{player?.name}</p>
      {player?.teamName && (
        <p className="player-compare-panel__team">{player.teamName}</p>
      )}
      <ul className="player-compare-panel__meta">
        {player?.number != null && (
          <li>
            <span>Dorsal</span>
            <strong>{player.number}</strong>
          </li>
        )}
        {player?.position && (
          <li>
            <span>Posición</span>
            <strong>{translatePlayerPosition(player.position)}</strong>
          </li>
        )}
        {player?.nationality && (
          <li>
            <span>Nacionalidad</span>
            <strong>{player.nationality}</strong>
          </li>
        )}
        {player?.age != null && (
          <li>
            <span>Edad</span>
            <strong>{player.age} años</strong>
          </li>
        )}
      </ul>
    </div>
  );
}

function PlayerEventsList({ events = [] }) {
  if (!events.length) {
    return <p className="player-compare-panel__empty">Sin eventos registrados</p>;
  }

  return (
    <ul className="player-compare-panel__events">
      {events.map((ev) => (
        <li key={ev.id}>
          <span className="player-compare-panel__event-icon" aria-hidden="true">
            {EVENT_ICONS[ev.kind] || '•'}
          </span>
          <span className="player-compare-panel__event-text">
            {ev.minuteLabel}&apos; — {ev.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ComparePanelColumn({
  side,
  label,
  player,
  statsVm,
  statsLoading,
  statsError,
  heatmap,
  events,
  compareRows,
  isActiveMobile,
  onRefetchStats,
  onRefetchHeatmap,
}) {
  const display = statsVm?.player || player;
  const enriched = {
    ...display,
    teamName: statsVm?.team?.name,
  };

  return (
    <div
      className={`player-compare-panel player-compare-panel--${side}${isActiveMobile ? ' player-compare-panel--active' : ''}`}
    >
      <PlayerPhoto player={enriched} label={label} />

      <section className="player-compare-panel__section">
        <h4 className="player-compare-panel__section-title">Estadísticas</h4>
        {statsLoading && (
          <p className="player-compare-panel__status">Cargando…</p>
        )}
        {statsError && !statsLoading && (
          <div className="player-compare-panel__status player-compare-panel__status--error">
            <p>{statsError}</p>
            <button type="button" className="lineups-retry-btn" onClick={onRefetchStats}>
              Reintentar
            </button>
          </div>
        )}
        {!statsLoading && !statsError && !statsVm?.hasStats && (
          <p className="player-compare-panel__empty">Sin estadísticas registradas</p>
        )}
        {!statsLoading && !statsError && statsVm?.hasStats && (
          <div className="player-compare-panel__stats">
            {compareRows.map((row) => (
              <div
                key={row.key}
                className={`player-compare-stat ${getSideCompareClass(side, row.winner)}`}
              >
                <span className="player-compare-stat__label">{row.label}</span>
                <span className="player-compare-stat__value">
                  {side === 'a' ? row.valueA : row.valueB}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="player-compare-panel__section">
        <h4 className="player-compare-panel__section-title">Eventos</h4>
        <PlayerEventsList events={events} />
      </section>

      <section className="player-compare-panel__section">
        <h4 className="player-compare-panel__section-title">Mapa de calor</h4>
        {heatmap.loading && (
          <p className="player-compare-panel__status">Cargando mapa…</p>
        )}
        {heatmap.error && !heatmap.loading && (
          <div className="player-compare-panel__status player-compare-panel__status--error">
            <p>{heatmap.error}</p>
            <button type="button" className="lineups-retry-btn" onClick={onRefetchHeatmap}>
              Reintentar
            </button>
          </div>
        )}
        {!heatmap.loading && !heatmap.error && heatmap.hasData && (
          <PlayerHeatmap points={heatmap.points} className="player-heatmap--compare" />
        )}
        {!heatmap.loading && !heatmap.error && !heatmap.hasData && (
          <p className="player-compare-panel__empty">Sin datos de mapa de calor</p>
        )}
      </section>
    </div>
  );
}

/**
 * Modal comparativo entre dos jugadores del mismo partido.
 */
export default function PlayerCompareModal({
  playerA,
  playerB,
  fixtureId,
  eventsByPlayer = {},
  onClose,
  onChangePlayerB,
}) {
  const [mobileTab, setMobileTab] = useState('a');

  const statsA = usePlayerStats(fixtureId, playerA?.id, {
    enabled: Boolean(fixtureId && playerA?.id),
    lineupPlayer: playerA,
  });

  const statsB = usePlayerStats(fixtureId, playerB?.id, {
    enabled: Boolean(fixtureId && playerB?.id),
    lineupPlayer: playerB,
  });

  const heatmapA = usePlayerHeatmap(fixtureId, playerA?.id, {
    enabled: Boolean(fixtureId && playerA?.id),
  });

  const heatmapB = usePlayerHeatmap(fixtureId, playerB?.id, {
    enabled: Boolean(fixtureId && playerB?.id),
  });

  const compareRows = useMemo(
    () => buildCompareMetricRows(statsA.viewModel?.matchStats, statsB.viewModel?.matchStats),
    [statsA.viewModel?.matchStats, statsB.viewModel?.matchStats]
  );

  const eventsA = eventsByPlayer[String(playerA?.id)] || [];
  const eventsB = eventsByPlayer[String(playerB?.id)] || [];

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

  if (typeof document === 'undefined' || !playerA || !playerB) return null;

  return createPortal(
    <div
      className="player-compare-modal__overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="player-compare-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-compare-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="player-compare-modal__header">
          <h2 id="player-compare-title" className="player-compare-modal__title">
            Comparación A vs B
          </h2>
          <div className="player-compare-modal__actions">
            <button
              type="button"
              className="player-compare-modal__change-btn"
              onClick={onChangePlayerB}
            >
              Cambiar jugador B
            </button>
            <button
              type="button"
              className="player-compare-modal__close"
              onClick={onClose}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </header>

        <div className="player-compare-modal__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'a'}
            className={mobileTab === 'a' ? 'is-active' : ''}
            onClick={() => setMobileTab('a')}
          >
            Jugador A
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'b'}
            className={mobileTab === 'b' ? 'is-active' : ''}
            onClick={() => setMobileTab('b')}
          >
            Jugador B
          </button>
        </div>

        <div className="player-compare-modal__body">
          <ComparePanelColumn
            side="a"
            label="A"
            player={playerA}
            statsVm={statsA.viewModel}
            statsLoading={statsA.loading}
            statsError={statsA.error}
            heatmap={heatmapA}
            events={eventsA}
            compareRows={compareRows}
            isActiveMobile={mobileTab === 'a'}
            onRefetchStats={statsA.refetch}
            onRefetchHeatmap={heatmapA.refetch}
          />
          <ComparePanelColumn
            side="b"
            label="B"
            player={playerB}
            statsVm={statsB.viewModel}
            statsLoading={statsB.loading}
            statsError={statsB.error}
            heatmap={heatmapB}
            events={eventsB}
            compareRows={compareRows}
            isActiveMobile={mobileTab === 'b'}
            onRefetchStats={statsB.refetch}
            onRefetchHeatmap={heatmapB.refetch}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
