import { useMemo } from 'react';
import { tokens } from '../../styles/tokens';
import {
  getCompetitionHistoryEditions,
  getHistoryMeta,
} from '../../utils/competitionHistory';
import '../../styles/standings.css';

const cardStyle = {
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  border: '1px solid rgba(79, 195, 247, 0.15)',
  padding: tokens.spacing.lg,
};

const championCardStyle = {
  ...cardStyle,
  border: '1px solid rgba(79, 195, 247, 0.45)',
  backgroundColor: 'rgba(79, 195, 247, 0.08)',
};

function TeamBadge({ name, flag, teamId, onTeamNavigate, role }) {
  const canNavigate = Boolean(onTeamNavigate && teamId);

  return (
    <button
      type="button"
      onClick={() => canNavigate && onTeamNavigate(teamId)}
      disabled={!canNavigate}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: tokens.spacing.sm,
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: canNavigate ? 'pointer' : 'default',
        color: tokens.colors.textPrimary,
        font: 'inherit',
        textAlign: 'left',
      }}
      title={canNavigate ? `Ver ficha (${role})` : undefined}
    >
      {flag && (
        <img
          src={flag}
          alt=""
          width={28}
          height={28}
          style={{ objectFit: 'contain', borderRadius: 4 }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      <span style={{ fontWeight: tokens.typography.fontWeightSemibold }}>{name}</span>
    </button>
  );
}

/**
 * Historial visual del torneo (mock local).
 */
export default function CompetitionHistorySection({ leagueId, domain = 'club', onTeamNavigate }) {
  const editions = useMemo(
    () => getCompetitionHistoryEditions(leagueId, domain),
    [leagueId, domain]
  );
  const meta = useMemo(() => getHistoryMeta(), []);
  const currentChampion = editions[0] || null;
  const pastEditions = editions.slice(1);

  if (!editions.length) {
    return (
      <div style={cardStyle}>
        <p style={{ margin: 0, color: tokens.colors.textSecondary }}>
          No hay historial disponible para esta competición.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
      <p style={{ margin: 0, color: tokens.colors.textSecondary, fontSize: tokens.typography.fontSizeSm }}>
        {meta.source}
        {meta.updatedAt ? ` · Actualizado: ${meta.updatedAt}` : ''}
        {' · '}
        Últimas {editions.length} ediciones (datos temporales)
      </p>

      {currentChampion && (
        <section style={championCardStyle}>
          <p
            style={{
              margin: `0 0 ${tokens.spacing.md}`,
              fontSize: tokens.typography.fontSizeSm,
              color: '#4FC3F7',
              fontWeight: tokens.typography.fontWeightSemibold,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Campeón más reciente · {currentChampion.year}
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: tokens.spacing.lg,
            }}
          >
            <div>
              <p style={{ margin: `0 0 ${tokens.spacing.xs}`, color: tokens.colors.textSecondary, fontSize: tokens.typography.fontSizeSm }}>
                Campeón
              </p>
              <TeamBadge
                name={currentChampion.championName}
                flag={currentChampion.championFlag}
                teamId={currentChampion.championId}
                onTeamNavigate={onTeamNavigate}
                role="campeón"
              />
            </div>
            {currentChampion.finalScore && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: tokens.typography.fontSize2xl, fontWeight: tokens.typography.fontWeightBold, color: '#4FC3F7' }}>
                  {currentChampion.finalScore}
                </p>
                <p style={{ margin: 0, fontSize: tokens.typography.fontSizeXs, color: tokens.colors.textMuted }}>
                  Final
                </p>
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: `0 0 ${tokens.spacing.xs}`, color: tokens.colors.textSecondary, fontSize: tokens.typography.fontSizeSm }}>
                Subcampeón
              </p>
              <TeamBadge
                name={currentChampion.runnerUpName}
                flag={currentChampion.runnerUpFlag}
                teamId={currentChampion.runnerUpId}
                onTeamNavigate={onTeamNavigate}
                role="subcampeón"
              />
            </div>
          </div>
        </section>
      )}

      <section style={cardStyle}>
        <h3
          style={{
            margin: `0 0 ${tokens.spacing.md}`,
            fontSize: tokens.typography.fontSizeLg,
            fontWeight: tokens.typography.fontWeightSemibold,
            color: tokens.colors.textPrimary,
          }}
        >
          Ediciones anteriores
        </h3>
        <div className="standings-table-wrapper table-responsive" style={{ padding: tokens.spacing.md }}>
          <table className="standings-table">
            <thead>
              <tr>
                <th>Año</th>
                <th className="text-left">Campeón</th>
                <th className="text-left">Subcampeón</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {(pastEditions.length > 0 ? pastEditions : editions).map((edition) => (
                <tr key={edition.year}>
                  <td className="position-cell">{edition.year}</td>
                  <td className="text-left">
                    <TeamBadge
                      name={edition.championName}
                      flag={edition.championFlag}
                      teamId={edition.championId}
                      onTeamNavigate={onTeamNavigate}
                      role="campeón"
                    />
                  </td>
                  <td className="text-left">
                    <TeamBadge
                      name={edition.runnerUpName}
                      flag={edition.runnerUpFlag}
                      teamId={edition.runnerUpId}
                      onTeamNavigate={onTeamNavigate}
                      role="subcampeón"
                    />
                  </td>
                  <td>{edition.finalScore || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
