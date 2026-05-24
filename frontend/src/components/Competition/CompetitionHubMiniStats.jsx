import { tokens } from '../../styles/tokens';
import '../../styles/standings.css';

const cardStyle = {
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  border: '1px solid rgba(79, 195, 247, 0.15)',
  padding: tokens.spacing.lg,
};

const titleStyle = {
  margin: `0 0 ${tokens.spacing.md}`,
  fontSize: tokens.typography.fontSizeMd,
  fontWeight: tokens.typography.fontWeightSemibold,
  color: tokens.colors.textPrimary,
};

const kpiGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: tokens.spacing.sm,
};

function KpiCell({ label, value, sub }) {
  return (
    <div
      style={{
        padding: tokens.spacing.sm,
        borderRadius: tokens.radius.md,
        backgroundColor: 'rgba(79, 195, 247, 0.06)',
        border: '1px solid rgba(79, 195, 247, 0.12)',
      }}
    >
      <p style={{ margin: 0, fontSize: tokens.typography.fontSizeXs, color: tokens.colors.textMuted }}>
        {label}
      </p>
      <p
        style={{
          margin: `${tokens.spacing.xs} 0 0`,
          fontSize: tokens.typography.fontSizeMd,
          fontWeight: tokens.typography.fontWeightBold,
          color: '#4FC3F7',
        }}
      >
        {value ?? '—'}
      </p>
      {sub != null && sub !== '' && (
        <div style={{ margin: `${tokens.spacing.xs} 0 0`, fontSize: tokens.typography.fontSizeXs, color: tokens.colors.textSecondary }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/**
 * Mini-KPIs del torneo para el hub.
 */
export default function CompetitionHubMiniStats({
  leader,
  kpis,
  highlights,
  loading,
  onTeamNavigate,
}) {
  if (loading) {
    return (
      <div style={cardStyle}>
        <p style={{ margin: 0, color: tokens.colors.textSecondary, fontSize: tokens.typography.fontSizeSm }}>
          Cargando estadísticas...
        </p>
      </div>
    );
  }

  if (!kpis && !leader) {
    return (
      <div style={cardStyle}>
        <h4 style={titleStyle}>Mini estadísticas</h4>
        <p style={{ margin: 0, color: tokens.colors.textSecondary, fontSize: tokens.typography.fontSizeSm }}>
          Sin datos de clasificación.
        </p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h4 style={titleStyle}>Mini estadísticas</h4>
      <div style={kpiGridStyle}>
        <KpiCell
          label="Líder"
          value={leader?.posicion != null ? `#${leader.posicion}` : '—'}
          sub={
            leader?.equipoId && onTeamNavigate ? (
              <button
                type="button"
                onClick={() => onTeamNavigate(leader.equipoId)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: tokens.colors.textPrimary,
                  cursor: 'pointer',
                  font: 'inherit',
                  textDecoration: 'underline',
                }}
              >
                {leader.equipo}
              </button>
            ) : (
              leader?.equipo
            )
          }
        />
        <KpiCell label="Goles / partido" value={kpis?.golesPorPartido} />
        <KpiCell
          label="Mejor ataque"
          value={highlights?.mejorAtaque?.golesFavor}
          sub={highlights?.mejorAtaque?.equipo}
        />
        <KpiCell
          label="Mejor defensa"
          value={highlights?.mejorDefensa?.golesContra}
          sub={highlights?.mejorDefensa?.equipo}
        />
      </div>
    </div>
  );
}
