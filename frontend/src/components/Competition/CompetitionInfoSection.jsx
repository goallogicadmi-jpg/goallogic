import { useMemo } from 'react';
import { tokens } from '../../styles/tokens';
import { getCompetitionInfo, getCompetitionInfoMeta } from '../../utils/competitionInfo';
import '../../styles/standings.css';

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

const labelStyle = {
  margin: `0 0 ${tokens.spacing.xs}`,
  fontSize: tokens.typography.fontSizeSm,
  color: tokens.colors.textSecondary,
  fontWeight: tokens.typography.fontWeightMedium,
};

const valueStyle = {
  margin: `0 0 ${tokens.spacing.md}`,
  fontSize: tokens.typography.fontSizeMd,
  color: tokens.colors.textPrimary,
  lineHeight: tokens.typography.lineHeightRelaxed,
};

function InfoBlock({ label, children }) {
  if (children == null || children === '') return null;
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      <div style={valueStyle}>{children}</div>
    </div>
  );
}

function BulletList({ items }) {
  if (!items?.length) return null;
  return (
    <ul
      style={{
        margin: `0 0 ${tokens.spacing.md}`,
        paddingLeft: tokens.spacing.lg,
        color: tokens.colors.textPrimary,
        fontSize: tokens.typography.fontSizeMd,
        lineHeight: tokens.typography.lineHeightRelaxed,
      }}
    >
      {items.map((item) => (
        <li key={item} style={{ marginBottom: tokens.spacing.xs }}>
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * Información editorial del torneo (mock local).
 */
export default function CompetitionInfoSection({ leagueId, competitionName }) {
  const info = useMemo(() => getCompetitionInfo(leagueId), [leagueId]);
  const meta = useMemo(() => getCompetitionInfoMeta(), []);

  const displayName = competitionName || 'Competición';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.lg }}>
      <p style={{ margin: 0, color: tokens.colors.textSecondary, fontSize: tokens.typography.fontSizeSm }}>
        {meta.source}
        {meta.updatedAt ? ` · Actualizado: ${meta.updatedAt}` : ''}
      </p>

      <section style={cardStyle}>
        <h2
          style={{
            margin: `0 0 ${tokens.spacing.lg}`,
            fontSize: tokens.typography.fontSize2xl,
            fontWeight: tokens.typography.fontWeightBold,
            color: '#4FC3F7',
          }}
        >
          {displayName}
        </h2>

        {info.description && (
          <p
            style={{
              margin: `0 0 ${tokens.spacing.lg}`,
              fontSize: tokens.typography.fontSizeMd,
              color: tokens.colors.textSecondary,
              lineHeight: tokens.typography.lineHeightRelaxed,
            }}
          >
            {info.description}
          </p>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: tokens.spacing.lg,
          }}
        >
          <div>
            <h3 style={sectionTitleStyle}>General</h3>
            <InfoBlock label="País / región">{info.country}</InfoBlock>
            <InfoBlock label="Formato">{info.format}</InfoBlock>
            <InfoBlock label="Equipos participantes">
              {info.teams != null ? String(info.teams) : null}
            </InfoBlock>
            <InfoBlock label="Calendario">{info.calendar}</InfoBlock>
          </div>

          <div>
            <h3 style={sectionTitleStyle}>Reglamento</h3>
            <InfoBlock label="Sistema de puntos">{info.pointsSystem}</InfoBlock>
            <InfoBlock label="Criterios de desempate">
              {info.tiebreakers?.length ? (
                <BulletList items={info.tiebreakers} />
              ) : null}
            </InfoBlock>
          </div>
        </div>

        {info.internationalSpots?.length > 0 && (
          <div style={{ marginTop: tokens.spacing.lg }}>
            <h3 style={sectionTitleStyle}>Cupos internacionales</h3>
            <BulletList items={info.internationalSpots} />
          </div>
        )}

        {(info.promotion != null || info.relegation != null) && (
          <div
            style={{
              marginTop: tokens.spacing.lg,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: tokens.spacing.md,
            }}
          >
            {info.promotion != null && (
              <div
                style={{
                  padding: tokens.spacing.md,
                  borderRadius: tokens.radius.md,
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                }}
              >
                <p style={{ ...labelStyle, margin: 0 }}>Ascensos</p>
                <p style={{ margin: `${tokens.spacing.xs} 0 0`, fontSize: tokens.typography.fontSize2xl, fontWeight: tokens.typography.fontWeightBold, color: tokens.colors.accentPositive }}>
                  {info.promotion}
                </p>
              </div>
            )}
            {info.relegation != null && (
              <div
                style={{
                  padding: tokens.spacing.md,
                  borderRadius: tokens.radius.md,
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <p style={{ ...labelStyle, margin: 0 }}>Descensos</p>
                <p style={{ margin: `${tokens.spacing.xs} 0 0`, fontSize: tokens.typography.fontSize2xl, fontWeight: tokens.typography.fontWeightBold, color: tokens.colors.accentNegative }}>
                  {info.relegation}
                </p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
