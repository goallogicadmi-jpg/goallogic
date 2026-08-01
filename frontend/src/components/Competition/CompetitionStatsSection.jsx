import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import EstadisticasAvanzadas from '../EstadisticasAvanzadas';
import { tokens } from '../../styles/tokens';
import {
  formatFormLetter,
  getFormBadgeClass,
  getTablaFromTorneoResponse,
} from '../../utils/competitionStandings';
import {
  computeTorneoKpis,
  getHighlightTeams,
  getTendenciaColor,
  mergeAvanzadasWithTabla,
} from '../../utils/competitionStats';
import { COMPETITION_TAB_IDS } from './competitionTabIds';
import CompetitionLinkButton from './CompetitionLinkButton';
import PremiumFeatureGate, { FEATURES } from '../Freemium/PremiumFeatureGate';
import { COMPETITION_PREMIUM_COPY } from '../../utils/competitionPremiumSections';
import { usePlanAccess } from '../../context/PlanAccessContext';
import '../../styles/standings.css';
import '../../styles/competitionStats.css';

const sectionGap = { display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg };

const cardStyle = {
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  border: '1px solid rgba(79, 195, 247, 0.15)',
  padding: tokens.spacing.lg,
};

const sectionTitleStyle = {
  margin: `0 0 ${tokens.spacing.md}`,
  fontSize: tokens.typography.fontSizeLg,
  fontWeight: tokens.typography.fontWeightSemibold,
  color: tokens.colors.textPrimary,
};

const kpiGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: tokens.spacing.md,
};

const chipRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: tokens.spacing.sm,
};

const loadingStyle = {
  textAlign: 'center',
  padding: tokens.spacing.xl,
  color: '#b0b0b0',
};

function KpiCard({ label, value, sub }) {
  return (
    <div
      style={{
        padding: tokens.spacing.md,
        borderRadius: tokens.radius.md,
        backgroundColor: 'rgba(79, 195, 247, 0.08)',
        border: '1px solid rgba(79, 195, 247, 0.2)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: tokens.typography.fontSize2xl,
          fontWeight: tokens.typography.fontWeightBold,
          color: '#4FC3F7',
        }}
      >
        {value ?? '—'}
      </div>
      <div
        style={{
          fontSize: tokens.typography.fontSizeSm,
          color: tokens.colors.textSecondary,
          marginTop: tokens.spacing.xs,
        }}
      >
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: tokens.typography.fontSizeXs, color: tokens.colors.textMuted, marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function HighlightChip({ label, team, action }) {
  if (!team) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: tokens.spacing.xs,
        padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
        borderRadius: '999px',
        backgroundColor: 'rgba(79, 195, 247, 0.12)',
        border: '1px solid rgba(79, 195, 247, 0.35)',
        color: tokens.colors.textPrimary,
        fontSize: tokens.typography.fontSizeSm,
      }}
    >
      <span>
        <strong style={{ color: '#4FC3F7' }}>{label}:</strong> {team.equipo}
      </span>
      {action}
    </span>
  );
}

function FormaChips({ forma }) {
  if (!forma) return <span style={{ color: tokens.colors.textMuted }}>—</span>;
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

function TendenciasRow({ team }) {
  const tendencias = team.tendencias || [];
  if (!tendencias.length) {
    return (
      <tr>
        <td className="text-left">{team.equipo}</td>
        <td colSpan={6} style={{ color: tokens.colors.textMuted }}>
          Sin datos recientes
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="text-left" style={{ fontWeight: tokens.typography.fontWeightMedium }}>
        {team.equipo}
      </td>
      {tendencias.slice(0, 6).map((t, idx) => (
        <td key={idx} title={`${t.rival} (${t.marcador})`}>
          <span
            style={{
              display: 'inline-block',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: tokens.typography.fontSizeXs,
              fontWeight: 600,
              color: '#fff',
              backgroundColor: getTendenciaColor(t.resultado),
            }}
          >
            {t.resultado === 'Victoria' ? 'G' : t.resultado === 'Derrota' ? 'P' : 'E'}
          </span>
        </td>
      ))}
      {Array.from({ length: Math.max(0, 6 - tendencias.length) }).map((_, idx) => (
        <td key={`empty-${idx}`}>—</td>
      ))}
    </tr>
  );
}

/**
 * Estadísticas del torneo: KPIs, tabla básica, tendencias, xG y wrapper de avanzadas.
 */
export default function CompetitionStatsSection({
  leagueId,
  season,
  onTeamNavigate,
  onNavigateToTab,
  standingsTabId = COMPETITION_TAB_IDS.TABLA,
}) {
  const { canAccessFeature } = usePlanAccess();
  const canAdvancedStats = canAccessFeature(FEATURES.ADVANCED_STATS);
  const canAdvancedModels = canAccessFeature(FEATURES.ADVANCED_MODELS);
  const [torneoData, setTorneoData] = useState(null);
  const [avanzadasData, setAvanzadasData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMultipleGroups, setHasMultipleGroups] = useState(false);

  useEffect(() => {
    if (!leagueId || !season) {
      setTorneoData(null);
      setAvanzadasData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const requests = [axios.get(`/estadisticas/torneo?leagueId=${leagueId}&season=${season}`)];
        if (canAdvancedStats || canAdvancedModels) {
          requests.push(axios.get(`/estadisticas/avanzadas?leagueId=${leagueId}&season=${season}`));
        }

        const [torneoRes, avanzadasRes] = await Promise.all(requests);
        if (cancelled) return;
        setTorneoData(torneoRes.data);
        setAvanzadasData(avanzadasRes?.data ?? null);
        setHasMultipleGroups(Boolean(torneoRes.data?.hasMultipleGroups));
      } catch (err) {
        console.error('Error cargando estadísticas de competición:', err);
        if (!cancelled) {
          setError('No se pudieron cargar las estadísticas del torneo.');
          setTorneoData(null);
          setAvanzadasData(null);
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
  }, [leagueId, season, canAdvancedStats, canAdvancedModels]);

  const tabla = useMemo(() => getTablaFromTorneoResponse(torneoData), [torneoData]);
  const equiposAvanzadas = useMemo(
    () => (Array.isArray(avanzadasData?.equipos) ? avanzadasData.equipos : []),
    [avanzadasData]
  );
  const mergedTeams = useMemo(
    () => mergeAvanzadasWithTabla(tabla, equiposAvanzadas),
    [tabla, equiposAvanzadas]
  );
  const kpis = useMemo(() => computeTorneoKpis(tabla), [tabla]);
  const highlights = useMemo(() => getHighlightTeams(tabla), [tabla]);

  if (loading) {
    return <p style={loadingStyle}>Cargando estadísticas del torneo...</p>;
  }

  if (error) {
    return (
      <div style={cardStyle}>
        <p style={{ margin: 0, color: tokens.colors.accentNegative }}>{error}</p>
      </div>
    );
  }

  if (!tabla.length) {
    return (
      <div style={cardStyle}>
        <p style={{ margin: 0, color: tokens.colors.textSecondary }}>
          No hay datos de estadísticas para esta competición y temporada.
        </p>
      </div>
    );
  }

  return (
    <div style={sectionGap}>
      {hasMultipleGroups && (
        <p style={{ margin: 0, color: tokens.colors.textSecondary, fontSize: tokens.typography.fontSizeSm }}>
          Estadísticas del primer grupo de la competición.
        </p>
      )}

      <section style={cardStyle}>
        <h3 style={sectionTitleStyle}>Estadísticas básicas</h3>
        <div className="standings-table-wrapper table-responsive">
          <table className="standings-table">
            <thead>
              <tr>
                <th>#</th>
                <th className="text-left">Equipo</th>
                <th>PJ</th>
                <th>GF</th>
                <th>GC</th>
                <th>DG</th>
                <th>Rend.</th>
                <th>Forma</th>
              </tr>
            </thead>
            <tbody>
              {tabla.map((team) => (
                <tr key={team.equipoId || team.equipo}>
                  <td className="position-cell">{team.posicion}</td>
                  <td className="text-left">
                    {onTeamNavigate && team.equipoId ? (
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
                        onClick={() => onTeamNavigate(team.equipoId)}
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
                  <td>
                    {team.diferencia > 0 ? '+' : ''}
                    {team.diferencia ?? 0}
                  </td>
                  <td>{team.rendimiento != null ? `${team.rendimiento}%` : '—'}</td>
                  <td>
                    <FormaChips forma={team.forma} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <PremiumFeatureGate
        feature={FEATURES.ADVANCED_STATS}
        title={COMPETITION_PREMIUM_COPY[FEATURES.ADVANCED_STATS].title}
        description={COMPETITION_PREMIUM_COPY[FEATURES.ADVANCED_STATS].description}
      >
      <section style={cardStyle}>
        <h3 style={sectionTitleStyle}>KPIs del torneo</h3>
        <div style={kpiGridStyle}>
          <KpiCard label="Goles / partido" value={kpis?.golesPorPartido} />
          <KpiCard label="Prom. GF / equipo" value={kpis?.promedioGF} />
          <KpiCard label="Prom. GC / equipo" value={kpis?.promedioGC} />
          <KpiCard
            label="Más goleador"
            value={kpis?.topScorer?.golesFavor}
            sub={kpis?.topScorer?.equipo}
          />
          <KpiCard
            label="Más sólido"
            value={kpis?.bestDefense?.golesContra}
            sub={kpis?.bestDefense?.equipo}
          />
          <KpiCard label="Total goles" value={kpis?.totalGF} />
        </div>
      </section>

      <section style={cardStyle}>
        <h3 style={sectionTitleStyle}>Destacados</h3>
        <div style={chipRowStyle}>
          <HighlightChip
            label="Mejor ataque"
            team={highlights.mejorAtaque}
            action={
              highlights.mejorAtaque ? (
                <CompetitionLinkButton
                  icon="table"
                  style={{ marginTop: 0 }}
                  onClick={() => onNavigateToTab?.(standingsTabId)}
                >
                  Ver tabla
                </CompetitionLinkButton>
              ) : null
            }
          />
          <HighlightChip
            label="Mejor defensa"
            team={highlights.mejorDefensa}
            action={
              highlights.mejorDefensa ? (
                <CompetitionLinkButton
                  icon="matches"
                  style={{ marginTop: 0 }}
                  onClick={() => onNavigateToTab?.(COMPETITION_TAB_IDS.PARTIDOS)}
                >
                  Ver partidos
                </CompetitionLinkButton>
              ) : null
            }
          />
          <HighlightChip label="Mejor forma" team={highlights.mejorForma} />
        </div>
      </section>

      <section style={cardStyle}>
        <h3 style={sectionTitleStyle}>Tendencias (últimos 6 partidos)</h3>
        <div className="standings-table-wrapper table-responsive" style={{ maxHeight: 420, overflowY: 'auto' }}>
          <table className="standings-table">
            <thead>
              <tr>
                <th className="text-left">Equipo</th>
                <th>J-6</th>
                <th>J-5</th>
                <th>J-4</th>
                <th>J-3</th>
                <th>J-2</th>
                <th>Último</th>
              </tr>
            </thead>
            <tbody>
              {tabla.map((team) => (
                <TendenciasRow key={team.equipoId || team.equipo} team={team} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={cardStyle}>
        <h3 style={sectionTitleStyle}>xG / xGA estimado por equipo</h3>
        <div className="standings-table-wrapper table-responsive">
          <table className="standings-table">
            <thead>
              <tr>
                <th className="text-left">Equipo</th>
                <th>xG est.</th>
                <th>xGA est.</th>
                <th>xA est.</th>
                <th>Posesión</th>
                <th>Tiros</th>
                <th>Efic.</th>
              </tr>
            </thead>
            <tbody>
              {mergedTeams.map((team) => (
                <tr key={team.equipoId || team.equipo}>
                  <td className="text-left">{team.equipo}</td>
                  <td style={{ color: '#4FC3F7', fontWeight: 600 }}>
                    {team.xG != null ? team.xG : '—'}
                  </td>
                  <td style={{ color: '#f59e0b', fontWeight: 600 }}>
                    {team.xGA_estimado != null ? team.xGA_estimado : '—'}
                  </td>
                  <td>{team.xA != null ? team.xA : '—'}</td>
                  <td>{team.posesion != null ? `${team.posesion}%` : '—'}</td>
                  <td>{team.tiros != null ? team.tiros : '—'}</td>
                  <td>{team.eficiencia != null ? team.eficiencia : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p
          style={{
            margin: `${tokens.spacing.sm} 0 0`,
            fontSize: tokens.typography.fontSizeXs,
            color: tokens.colors.textMuted,
          }}
        >
          xGA estimado a partir de goles encajados y el ratio xG/goles del equipo (misma fuente que estadísticas avanzadas).
        </p>
      </section>
      </PremiumFeatureGate>

      <PremiumFeatureGate
        feature={FEATURES.ADVANCED_MODELS}
        title={COMPETITION_PREMIUM_COPY[FEATURES.ADVANCED_MODELS].title}
        description={COMPETITION_PREMIUM_COPY[FEATURES.ADVANCED_MODELS].description}
      >
      <section style={cardStyle}>
        <h3 style={sectionTitleStyle}>Estadísticas avanzadas del torneo</h3>
        <div className="competition-stats-advanced-wrap">
          <EstadisticasAvanzadas leagueId={leagueId} season={season} />
        </div>
      </section>
      </PremiumFeatureGate>
    </div>
  );
}
