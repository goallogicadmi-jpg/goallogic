import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { getLeagueFixtures } from '../../api/api';
import {
  SESSION_REQUIRED_PREDICCIONES_TOAST_MESSAGE,
  SESSION_REQUIRED_TOAST_DURATION_MS,
} from '../../constants/sessionMessages';
import { usePrediccionesNavigation } from '../../hooks/usePrediccionesNavigation';
import useSelectedPartidoLiveSync from '../../hooks/useSelectedPartidoLiveSync';
import PartidoCard from '../Partidos/PartidoCard';
import MatchCenter from '../Partidos/MatchCenter';
import Toast from '../Toast';
import { tokens } from '../../styles/tokens';
import {
  buildTendenciasSummary,
  formatFormLetter,
  getFormBadgeClass,
  getLeaderFromTabla,
  getRelegationTeams,
  getTablaFromTorneoResponse,
} from '../../utils/competitionStandings';
import { getLatestChampion } from '../../utils/competitionHistory';
import { COMPETITION_TAB_IDS } from './competitionTabIds';
import CompetitionLinkButton from './CompetitionLinkButton';
import '../../styles/partidos.css';
import '../../styles/standings.css';

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: tokens.spacing.lg,
};

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

function MiniStandingsTable({ rows, leagueId, onTeamClick, zone = 'top' }) {
  if (!rows?.length) {
    return <p style={mutedStyle}>No hay datos de clasificación disponibles.</p>;
  }

  return (
    <div className="standings-table-wrapper table-responsive" style={{ padding: tokens.spacing.md }}>
      <table className="standings-table">
        <thead>
          <tr>
            <th>#</th>
            <th className="text-left">Equipo</th>
            <th>PJ</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((team) => (
            <tr
              key={team.equipoId || team.equipo}
              className={zone === 'relegation' ? 'zone-relegation' : undefined}
            >
              <td className="position-cell">{team.posicion}</td>
              <td className="text-left">
                <button
                  type="button"
                  className="team-cell"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: onTeamClick ? 'pointer' : 'default',
                    color: 'inherit',
                    font: 'inherit',
                    textAlign: 'left',
                  }}
                  onClick={() => onTeamClick?.(team.equipoId)}
                  disabled={!onTeamClick || !team.equipoId}
                >
                  {team.equipo}
                </button>
              </td>
              <td>{team.partidosJugados ?? team.pj ?? '—'}</td>
              <td className="points-cell">{team.puntos ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Resumen de competición: próximo partido, top 3, descenso, racha del líder.
 */
export default function CompetitionSummary({
  leagueId,
  season,
  domain = 'club',
  onTeamNavigate,
  onGoToAllMatches,
  onNavigateToTab,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [proximoPartido, setProximoPartido] = useState(null);
  const [tabla, setTabla] = useState([]);
  const [hasMultipleGroups, setHasMultipleGroups] = useState(false);
  const [partidoSeleccionado, setPartidoSeleccionado] = useState(null);

  useSelectedPartidoLiveSync(partidoSeleccionado, setPartidoSeleccionado);
  const {
    handlePrediccionesClick,
    showSessionToast,
    setShowSessionToast,
  } = usePrediccionesNavigation(domain, leagueId);

  useEffect(() => {
    if (!leagueId || !season) {
      setProximoPartido(null);
      setTabla([]);
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

        const torneoData = torneoRes.data;
        setHasMultipleGroups(Boolean(torneoData?.hasMultipleGroups));
        setTabla(getTablaFromTorneoResponse(torneoData));
      } catch (err) {
        console.error('Error cargando resumen de competición:', err);
        if (!cancelled) {
          setError('No se pudo cargar el resumen de la competición.');
          setProximoPartido(null);
          setTabla([]);
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

  const leader = useMemo(() => getLeaderFromTabla(tabla), [tabla]);
  const topThree = useMemo(() => tabla.slice(0, 3), [tabla]);
  const relegationTeams = useMemo(
    () => getRelegationTeams(tabla, leagueId),
    [tabla, leagueId]
  );
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

  if (loading) {
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
      <div style={gridStyle}>
        <section style={{ ...cardStyle, gridColumn: proximoPartido ? '1 / -1' : undefined }}>
          <h3 style={cardTitleStyle}>Próximo partido</h3>
          {proximoPartido ? (
            <>
              <PartidoCard
                partido={proximoPartido}
                domain={domain}
                onClick={() => setPartidoSeleccionado(proximoPartido)}
                onPrediccionesClick={handlePrediccionesClick}
              />
              <CompetitionLinkButton
                icon="chart"
                onClick={() => onNavigateToTab?.(COMPETITION_TAB_IDS.ESTADISTICAS)}
              >
                Ver análisis
              </CompetitionLinkButton>
            </>
          ) : (
            <p style={mutedStyle}>No hay partidos programados próximamente.</p>
          )}
        </section>

        <section style={cardStyle}>
          <h3 style={cardTitleStyle}>Top 3</h3>
          {hasMultipleGroups && (
            <p style={{ ...mutedStyle, marginBottom: tokens.spacing.sm }}>
              Clasificación del primer grupo.
            </p>
          )}
          <MiniStandingsTable
            rows={topThree}
            leagueId={leagueId}
            onTeamClick={onTeamNavigate}
            zone="top"
          />
        </section>

        <section style={cardStyle}>
          <h3 style={cardTitleStyle}>Zona de descenso</h3>
          {relegationTeams.length > 0 ? (
            <MiniStandingsTable
              rows={relegationTeams}
              leagueId={leagueId}
              onTeamClick={onTeamNavigate}
              zone="relegation"
            />
          ) : (
            <p style={mutedStyle}>
              {tabla.length === 0
                ? 'Sin tabla de liga para esta competición.'
                : 'No aplica zona de descenso en este formato.'}
            </p>
          )}
        </section>

        <section style={cardStyle}>
          <h3 style={cardTitleStyle}>
            Racha del líder{leader?.equipo ? `: ${leader.equipo}` : ''}
          </h3>
          {leader ? (
            <>
              <div style={{ marginBottom: tokens.spacing.md }}>
                <FormaChips forma={leader.forma} />
              </div>
              {leader.rendimiento != null && (
                <p style={{ ...mutedStyle, marginBottom: tokens.spacing.sm }}>
                  Rendimiento: <strong style={{ color: tokens.colors.textPrimary }}>{leader.rendimiento}%</strong>
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
            <p style={mutedStyle}>No hay datos del líder disponibles.</p>
          )}
          {leader && (
            <CompetitionLinkButton
              icon="table"
              onClick={() => onNavigateToTab?.(COMPETITION_TAB_IDS.TABLA)}
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
      </div>

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
