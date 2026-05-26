import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { getLeagueFixtures } from '../../api/api';
import {
  SESSION_REQUIRED_PREDICCIONES_TOAST_MESSAGE,
  SESSION_REQUIRED_TOAST_DURATION_MS,
} from '../../constants/sessionMessages';
import { usePrediccionesNavigation } from '../../hooks/usePrediccionesNavigation';
import PartidoCard from '../Partidos/PartidoCard';
import MatchCenter from '../Partidos/MatchCenter';
import Toast from '../Toast';
import { tokens } from '../../styles/tokens';
import {
  buildTendenciasSummary,
  formatFormLetter,
  getFormBadgeClass,
  getLeaderFromTabla,
  getTablaFromTorneoResponse,
} from '../../utils/competitionStandings';
import {
  flattenCupGroupsToTeams,
  getLeaderGroupFromCup,
  getSelectionHighlights,
  mergeTorneoFormaIntoTeams,
} from '../../utils/selectionCompetition';
import { useCupCompetitionData } from '../../hooks/useCupCompetitionData';
import { getLatestChampion } from '../../utils/competitionHistory';
import { COMPETITION_TAB_IDS } from './competitionTabIds';
import CompetitionLinkButton from './CompetitionLinkButton';
import '../../styles/partidos.css';
import '../../styles/standings.css';

const cardStyle = {
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  border: '1px solid rgba(79, 195, 247, 0.15)',
  padding: tokens.spacing.lg,
};

const cardTitleStyle = {
  margin: `0 0 ${tokens.spacing.md}`,
  fontSize: tokens.typography.fontSizeLg,
  fontWeight: tokens.typography.fontWeightSemibold,
  color: tokens.colors.textPrimary,
};

const mutedStyle = {
  margin: 0,
  color: tokens.colors.textSecondary,
  fontSize: tokens.typography.fontSizeMd,
};

const loadingStyle = {
  textAlign: 'center',
  padding: tokens.spacing.xl,
  color: '#b0b0b0',
};

const chipRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: tokens.spacing.sm,
};

function HighlightChip({ label, team }) {
  if (!team) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: tokens.spacing.xs,
        padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
        borderRadius: '999px',
        backgroundColor: 'rgba(79, 195, 247, 0.12)',
        border: '1px solid rgba(79, 195, 247, 0.35)',
        color: tokens.colors.textPrimary,
        fontSize: tokens.typography.fontSizeSm,
      }}
    >
      <strong style={{ color: '#4FC3F7' }}>{label}:</strong> {team.equipo}
    </span>
  );
}

function FormaChips({ forma }) {
  if (!forma) return <span style={mutedStyle}>Sin datos de forma reciente</span>;
  return (
    <span className="form-cell">
      {forma.split('').map((letra, idx) => (
        <span key={idx} className={`form-badge ${getFormBadgeClass(letra)}`}>
          {formatFormLetter(letra)}
        </span>
      ))}
    </span>
  );
}

function MiniGroupTable({ rows, groupLabel, onTeamClick }) {
  if (!rows?.length) {
    return <p style={mutedStyle}>No hay datos del grupo disponibles.</p>;
  }

  return (
  <>
      {groupLabel && (
        <p style={{ ...mutedStyle, marginBottom: tokens.spacing.sm }}>{groupLabel}</p>
      )}
      <div className="standings-table-wrapper table-responsive" style={{ padding: tokens.spacing.md }}>
        <table className="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th className="text-left">Selección</th>
              <th>PJ</th>
              <th>GF</th>
              <th>GC</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 4).map((team) => (
              <tr key={team.equipoId || team.equipo}>
                <td className="position-cell">{team.posicion}</td>
                <td className="text-left">
                  {onTeamClick && team.equipoId ? (
                    <button
                      type="button"
                      className="team-cell"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: 'inherit',
                        font: 'inherit',
                      }}
                      onClick={() => onTeamClick(team.equipoId)}
                    >
                      {team.equipo}
                    </button>
                  ) : (
                    team.equipo
                  )}
                </td>
                <td>{team.jugados ?? '—'}</td>
                <td>{team.golesFavor ?? 0}</td>
                <td>{team.golesContra ?? 0}</td>
                <td className="points-cell">{team.puntos ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * Resumen para torneos de selecciones: próximo partido, grupo líder, racha y chips.
 */
export default function SelectionSummary({
  leagueId,
  season,
  competitionInfo,
  domain = 'selection',
  onTeamNavigate,
  onGoToAllMatches,
  onNavigateToTab,
  standingsTabId = COMPETITION_TAB_IDS.GRUPOS,
}) {
  const cupData = useCupCompetitionData(leagueId, season, competitionInfo, true, 'selection');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [proximoPartido, setProximoPartido] = useState(null);
  const [torneoTabla, setTorneoTabla] = useState([]);
  const [partidoSeleccionado, setPartidoSeleccionado] = useState(null);
  const {
    handlePrediccionesClick,
    showSessionToast,
    setShowSessionToast,
  } = usePrediccionesNavigation(domain, leagueId);

  useEffect(() => {
    if (!leagueId || !season) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [fixturesData, torneoRes] = await Promise.all([
          getLeagueFixtures(leagueId, season, { next: 10, last: 1 }),
          axios.get(`/estadisticas/torneo?leagueId=${leagueId}&season=${season}`),
        ]);
        if (cancelled) return;

        const proximos = Array.isArray(fixturesData?.proximos) ? fixturesData.proximos : [];
        const sortedProximos = [...proximos].sort(
          (a, b) => new Date(a.fixture?.date || 0) - new Date(b.fixture?.date || 0)
        );
        setProximoPartido(sortedProximos[0] || null);
        setTorneoTabla(getTablaFromTorneoResponse(torneoRes.data));
      } catch (err) {
        console.error('Error cargando resumen de selecciones:', err);
        if (!cancelled) {
          setError('No se pudo cargar el resumen del torneo.');
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

  const leaderGroup = useMemo(
    () => getLeaderGroupFromCup(cupData.selectableGroups),
    [cupData.selectableGroups]
  );

  const groupTablaEnriched = useMemo(() => {
    return mergeTorneoFormaIntoTeams(leaderGroup.tabla, torneoTabla);
  }, [leaderGroup.tabla, torneoTabla]);

  const allTeams = useMemo(() => {
    const fromCup = flattenCupGroupsToTeams(cupData.selectableGroups);
    return mergeTorneoFormaIntoTeams(fromCup.length ? fromCup : torneoTabla, torneoTabla);
  }, [cupData.selectableGroups, torneoTabla]);

  const leader = useMemo(
    () => getLeaderFromTabla(groupTablaEnriched.length ? groupTablaEnriched : torneoTabla),
    [groupTablaEnriched, torneoTabla]
  );

  const highlights = useMemo(() => getSelectionHighlights(allTeams), [allTeams]);
  const tendenciasSummary = useMemo(
    () => buildTendenciasSummary(leader?.tendencias),
    [leader?.tendencias]
  );
  const latestChampion = useMemo(
    () => getLatestChampion(leagueId, domain),
    [leagueId, domain]
  );

  const handleViewAllMatches = useCallback(() => {
    onGoToAllMatches?.();
  }, [onGoToAllMatches]);

  if (loading || cupData.loading) {
    return <p style={loadingStyle}>Cargando resumen...</p>;
  }

  if (error) {
    return (
      <div style={cardStyle}>
        <p style={{ ...mutedStyle, color: tokens.colors.accentNegative }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
      <section style={cardStyle}>
        <h3 style={cardTitleStyle}>Próximo partido</h3>
        {proximoPartido ? (
          <>
            <PartidoCard
              partido={proximoPartido}
              domain={domain}
              onClick={() => setPartidoSeleccionado(proximoPartido)}
              onPrediccionesClick={handlePrediccionesClick}
            />
          </>
        ) : (
          <p style={mutedStyle}>No hay partidos programados próximamente.</p>
        )}
      </section>

      <section style={cardStyle}>
        <h3 style={cardTitleStyle}>
          {leaderGroup.groupLabel
            ? `Tabla — ${leaderGroup.groupLabel}`
            : 'Clasificación del torneo'}
        </h3>
        <MiniGroupTable
          rows={groupTablaEnriched.length ? groupTablaEnriched : torneoTabla}
          onTeamClick={onTeamNavigate}
        />
      </section>

      <section style={cardStyle}>
        <h3 style={cardTitleStyle}>
          Mejor posicionado{leader?.equipo ? `: ${leader.equipo}` : ''}
        </h3>
        {leader ? (
          <>
            <div style={{ marginBottom: tokens.spacing.md }}>
              <FormaChips forma={leader.forma} />
            </div>
            {leader.rendimiento != null && (
              <p style={{ ...mutedStyle, marginBottom: tokens.spacing.sm }}>
                Rendimiento:{' '}
                <strong style={{ color: tokens.colors.textPrimary }}>{leader.rendimiento}%</strong>
              </p>
            )}
            {tendenciasSummary && (
              <p style={mutedStyle}>
                Últimos {tendenciasSummary.total} partidos: {tendenciasSummary.wins}G ·{' '}
                {tendenciasSummary.draws}E · {tendenciasSummary.losses}P
              </p>
            )}
          </>
        ) : (
          <p style={mutedStyle}>No hay datos de forma disponibles.</p>
        )}
        {leader && (
          <CompetitionLinkButton
            icon="table"
            onClick={() => onNavigateToTab?.(standingsTabId)}
          >
            Ver tabla completa
          </CompetitionLinkButton>
        )}
      </section>

      {latestChampion && (
        <section style={cardStyle}>
          <h3 style={cardTitleStyle}>Campeón actual</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.md, flexWrap: 'wrap' }}>
            {latestChampion.championFlag && (
              <img
                src={latestChampion.championFlag}
                alt=""
                width={32}
                height={24}
                style={{ objectFit: 'cover', borderRadius: 2 }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div>
              <p style={{ margin: 0, color: tokens.colors.textPrimary, fontWeight: tokens.typography.fontWeightSemibold }}>
                {latestChampion.championName}
              </p>
              <p style={{ ...mutedStyle, marginTop: tokens.spacing.xs }}>
                {latestChampion.year}
                {latestChampion.finalScore ? ` · ${latestChampion.finalScore}` : ''}
              </p>
            </div>
          </div>
          <CompetitionLinkButton
            icon="history"
            onClick={() => onNavigateToTab?.(COMPETITION_TAB_IDS.HISTORIAL)}
          >
            Ver historial
          </CompetitionLinkButton>
        </section>
      )}

      {(highlights.mejorAtaque || highlights.mejorDefensa) && (
        <section style={cardStyle}>
          <h3 style={cardTitleStyle}>Destacados del torneo</h3>
          <div style={chipRowStyle}>
            <HighlightChip label="Mejor ataque" team={highlights.mejorAtaque} />
            <HighlightChip label="Mejor defensa" team={highlights.mejorDefensa} />
          </div>
        </section>
      )}

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={handleViewAllMatches}
          style={{
            padding: `${tokens.spacing.sm} ${tokens.spacing.xl}`,
            borderRadius: tokens.radius.md,
            border: '1px solid rgba(79, 195, 247, 0.5)',
            backgroundColor: 'rgba(79, 195, 247, 0.12)',
            color: '#4FC3F7',
            fontSize: tokens.typography.fontSizeMd,
            fontWeight: tokens.typography.fontWeightSemibold,
            cursor: 'pointer',
          }}
        >
          Ver todos los partidos
        </button>
      </div>

      {partidoSeleccionado && (
        <MatchCenter
          partido={partidoSeleccionado}
          domain={domain}
          onClose={() => setPartidoSeleccionado(null)}
        />
      )}

      {showSessionToast && (
        <Toast
          message={SESSION_REQUIRED_PREDICCIONES_TOAST_MESSAGE}
          type="warning"
          duration={SESSION_REQUIRED_TOAST_DURATION_MS}
          onClose={() => setShowSessionToast(false)}
        />
      )}
    </div>
  );
}
