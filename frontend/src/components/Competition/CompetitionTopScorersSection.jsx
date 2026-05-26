import { useEffect, useState } from 'react';
import { getLeagueTopAssists, getLeagueTopScorers } from '../../api/api';
import { tokens } from '../../styles/tokens';
import {
  clearTopAssistsApiCache,
  clearTopScorersApiCache,
  fetchLeagueTopAssists,
  fetchLeagueTopScorers,
} from '../../utils/competitionTopScorers';
import CompetitionLinkButton from './CompetitionLinkButton';
import PlayerModal from '../Partidos/PlayerModal';
import '../../styles/standings.css';

const cardStyle = {
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  border: '1px solid rgba(79, 195, 247, 0.15)',
  padding: tokens.spacing.lg,
};

const loadingStyle = {
  textAlign: 'center',
  padding: tokens.spacing.xl,
  color: '#b0b0b0',
};

const playerNameButtonStyle = {
  display: 'inline',
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  cursor: 'pointer',
  color: 'inherit',
  font: 'inherit',
  fontWeight: 'inherit',
  textAlign: 'left',
};

function PlayerNameButton({ player, onPlayerSelect, asStrong = false }) {
  const canOpen = Boolean(player?.playerId && onPlayerSelect);
  const name = player?.playerName ?? '—';

  if (!canOpen) {
    return asStrong ? <strong>{name}</strong> : <span>{name}</span>;
  }

  const handleClick = () => onPlayerSelect(player);

  if (asStrong) {
    return (
      <button
        type="button"
        className="team-cell"
        style={{ ...playerNameButtonStyle, fontWeight: tokens.typography.fontWeightBold }}
        onClick={handleClick}
        title="Ver ficha del jugador"
      >
        {name}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="team-cell"
      style={playerNameButtonStyle}
      onClick={handleClick}
      title="Ver ficha del jugador"
    >
      {name}
    </button>
  );
}

function ScorersTable({ rows, valueKey, valueLabel, onPlayerSelect }) {
  if (!rows.length) {
    return (
      <p style={{ margin: 0, color: tokens.colors.textSecondary }}>
        No hay datos disponibles para esta categoría.
      </p>
    );
  }

  return (
    <div className="standings-table-wrapper table-responsive" style={{ padding: tokens.spacing.md }}>
      <table className="standings-table">
        <thead>
          <tr>
            <th>#</th>
            <th className="text-left">Jugador</th>
            <th className="text-left">Equipo</th>
            <th>{valueLabel}</th>
            <th>PJ</th>
            <th>Min</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((player) => (
            <tr key={player.playerId ?? `row-${player.rank}`}>
              <td className="position-cell">{player.rank}</td>
              <td className="text-left">
                <PlayerNameButton player={player} onPlayerSelect={onPlayerSelect} />
              </td>
              <td className="text-left">{player.teamName}</td>
              <td style={{ fontWeight: tokens.typography.fontWeightBold, color: '#4FC3F7' }}>
                {player[valueKey]}
              </td>
              <td>{player.appearances > 0 ? player.appearances : '—'}</td>
              <td>{player.minutes > 0 ? player.minutes : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Goleadores: GET /players/topscorers · Asistencias: GET /players/topassists (orden de la API).
 */
export default function CompetitionTopScorersSection({
  leagueId,
  season,
  isSelectionLayout = false,
  competitionInfo,
  onTeamNavigate,
}) {
  const [view, setView] = useState('goles');
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState(null);

  const openPlayerPanel = (player) => {
    if (!player?.playerId) return;
    setSelectedPlayerId(player.playerId);
    setSelectedPlayerName(player.playerName ?? null);
  };

  const closePlayerPanel = () => {
    setSelectedPlayerId(null);
    setSelectedPlayerName(null);
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scorerRows, setScorerRows] = useState([]);

  const [assistsLoading, setAssistsLoading] = useState(false);
  const [assistsError, setAssistsError] = useState(null);
  const [assistRows, setAssistRows] = useState([]);

  useEffect(() => {
    const normalizedLeagueId = leagueId != null ? String(leagueId).trim() : '';
    const normalizedSeason = season != null ? String(season).trim() : '';

    if (!normalizedLeagueId || !normalizedSeason) {
      setScorerRows([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const rows = await fetchLeagueTopScorers(
          normalizedLeagueId,
          normalizedSeason,
          getLeagueTopScorers
        );
        if (!cancelled) {
          setScorerRows(rows);
          setError(null);
        }
      } catch (err) {
        console.error('Error cargando goleadores:', err);
        clearTopScorersApiCache(normalizedLeagueId, normalizedSeason);
        if (!cancelled) {
          setError('No se pudieron cargar los goleadores de esta competición.');
          setScorerRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [leagueId, season]);

  useEffect(() => {
    const normalizedLeagueId = leagueId != null ? String(leagueId).trim() : '';
    const normalizedSeason = season != null ? String(season).trim() : '';

    if (view !== 'asistencias' || !normalizedLeagueId || !normalizedSeason) {
      return;
    }

    let cancelled = false;

    async function loadAssists() {
      setAssistsLoading(true);
      setAssistsError(null);

      try {
        const rows = await fetchLeagueTopAssists(
          normalizedLeagueId,
          normalizedSeason,
          getLeagueTopAssists
        );
        if (!cancelled) {
          setAssistRows(rows);
          setAssistsError(null);
        }
      } catch (err) {
        console.error('Error cargando asistencias:', err);
        clearTopAssistsApiCache(normalizedLeagueId, normalizedSeason);
        if (!cancelled) {
          const status = String(err?.message || '');
          const noData =
            status.includes('502') ||
            status.includes('no devolvió asistencias') ||
            status.includes('No hay datos de asistencias');
          setAssistRows([]);
          setAssistsError(noData ? null : 'No se pudieron cargar las asistencias de esta competición.');
        }
      } finally {
        if (!cancelled) {
          setAssistsLoading(false);
        }
      }
    }

    loadAssists();

    return () => {
      cancelled = true;
    };
  }, [view, leagueId, season]);

  useEffect(() => {
    setAssistRows([]);
    setAssistsError(null);
  }, [leagueId, season]);

  const subTabStyle = (active) => ({
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    borderRadius: tokens.radius.md,
    border: active ? '1px solid rgba(79, 195, 247, 0.5)' : '1px solid transparent',
    backgroundColor: active ? 'rgba(79, 195, 247, 0.12)' : 'transparent',
    color: active ? '#4FC3F7' : tokens.colors.textSecondary,
    fontSize: tokens.typography.fontSizeMd,
    fontWeight: active ? tokens.typography.fontWeightSemibold : tokens.typography.fontWeightMedium,
    cursor: 'pointer',
  });

  if (loading && view === 'goles') {
    return (
      <div style={cardStyle}>
        <p style={loadingStyle}>Cargando goleadores...</p>
      </div>
    );
  }

  if (error && view === 'goles') {
    return (
      <div style={cardStyle}>
        <p style={{ margin: 0, color: tokens.colors.accentNegative }}>{error}</p>
      </div>
    );
  }

  const topScorer = scorerRows[0];
  const topAssist = assistRows[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
      <p style={{ margin: 0, color: tokens.colors.textSecondary, fontSize: tokens.typography.fontSizeSm }}>
        Ranking oficial de la competición
        {competitionInfo?.name ? ` · ${competitionInfo.name}` : ''}
        {season ? ` · Temporada ${season}` : ''}
      </p>

      <div style={{ display: 'flex', gap: tokens.spacing.sm, flexWrap: 'wrap' }}>
        <button type="button" style={subTabStyle(view === 'goles')} onClick={() => setView('goles')}>
          Goleadores
        </button>
        <button
          type="button"
          style={subTabStyle(view === 'asistencias')}
          onClick={() => setView('asistencias')}
        >
          Asistencias
        </button>
      </div>

      {view === 'goles' && topScorer && (
        <section style={cardStyle}>
          <h3
            style={{
              margin: `0 0 ${tokens.spacing.sm}`,
              fontSize: tokens.typography.fontSizeLg,
              fontWeight: tokens.typography.fontWeightSemibold,
              color: tokens.colors.textPrimary,
            }}
          >
            Máximo goleador
          </h3>
          <p style={{ margin: `0 0 ${tokens.spacing.xs}`, color: tokens.colors.textPrimary }}>
            <PlayerNameButton
              player={topScorer}
              onPlayerSelect={openPlayerPanel}
              asStrong
            />
            <span style={{ color: tokens.colors.textSecondary }}>
              {' '}
              · {topScorer.teamName} · {topScorer.goals} goles
            </span>
          </p>
          {topScorer.teamId && onTeamNavigate && (
            <CompetitionLinkButton
              icon="arrow"
              onClick={() => onTeamNavigate(topScorer.teamId)}
            >
              Ver equipo
            </CompetitionLinkButton>
          )}
        </section>
      )}

      {view === 'asistencias' && topAssist && !assistsLoading && (
        <section style={cardStyle}>
          <h3
            style={{
              margin: `0 0 ${tokens.spacing.sm}`,
              fontSize: tokens.typography.fontSizeLg,
              fontWeight: tokens.typography.fontWeightSemibold,
              color: tokens.colors.textPrimary,
            }}
          >
            Máximo asistente
          </h3>
          <p style={{ margin: `0 0 ${tokens.spacing.xs}`, color: tokens.colors.textPrimary }}>
            <PlayerNameButton
              player={topAssist}
              onPlayerSelect={openPlayerPanel}
              asStrong
            />
            <span style={{ color: tokens.colors.textSecondary }}>
              {' '}
              · {topAssist.teamName} · {topAssist.assists} asistencias
            </span>
          </p>
          {topAssist.teamId && onTeamNavigate && (
            <CompetitionLinkButton
              icon="arrow"
              onClick={() => onTeamNavigate(topAssist.teamId)}
            >
              Ver equipo
            </CompetitionLinkButton>
          )}
        </section>
      )}

      <section style={cardStyle}>
        {view === 'goles' ? (
          <>
            <h3
              style={{
                margin: `0 0 ${tokens.spacing.md}`,
                fontSize: tokens.typography.fontSizeLg,
                fontWeight: tokens.typography.fontWeightSemibold,
                color: tokens.colors.textPrimary,
              }}
            >
              Top goleadores
            </h3>
            <ScorersTable
              rows={scorerRows}
              valueKey="goals"
              valueLabel="Goles"
              onPlayerSelect={openPlayerPanel}
            />
          </>
        ) : (
          <>
            <h3
              style={{
                margin: `0 0 ${tokens.spacing.md}`,
                fontSize: tokens.typography.fontSizeLg,
                fontWeight: tokens.typography.fontWeightSemibold,
                color: tokens.colors.textPrimary,
              }}
            >
              Top asistencias
            </h3>
            {assistsLoading ? (
              <p style={{ ...loadingStyle, padding: tokens.spacing.lg }}>Cargando asistencias...</p>
            ) : assistsError ? (
              <p style={{ margin: 0, color: tokens.colors.accentNegative }}>{assistsError}</p>
            ) : (
              <ScorersTable
                rows={assistRows}
                valueKey="assists"
                valueLabel="Asist."
                onPlayerSelect={openPlayerPanel}
              />
            )}
          </>
        )}
      </section>

      {selectedPlayerId && (
        <PlayerModal
          playerId={selectedPlayerId}
          playerName={selectedPlayerName}
          onClose={closePlayerPanel}
        />
      )}
    </div>
  );
}
