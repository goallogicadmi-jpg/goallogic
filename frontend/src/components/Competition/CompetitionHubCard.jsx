import { tokens } from '../../styles/tokens';
const cardStyle = {
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  border: '1px solid rgba(79, 195, 247, 0.15)',
  padding: tokens.spacing.lg,
};

/**
 * Cabecera de tarjeta del hub: nombre, región, logo y acceso a la competición.
 */
export default function CompetitionHubCard({
  competition,
  domain,
  editorialInfo,
  currentChampion,
  season,
  onViewCompetition,
}) {
  const region = editorialInfo?.country || competition?.country || '—';
  const format = editorialInfo?.format || competition?.type || '—';
  const logo = competition?.logo;

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', gap: tokens.spacing.md, alignItems: 'flex-start' }}>
        {logo && (
          <img
            src={logo}
            alt=""
            style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              margin: `0 0 ${tokens.spacing.xs}`,
              fontSize: tokens.typography.fontSizeLg,
              fontWeight: tokens.typography.fontWeightBold,
              color: tokens.colors.textPrimary,
            }}
          >
            {competition?.name}
          </h3>
          <p style={{ margin: `0 0 ${tokens.spacing.xs}`, color: tokens.colors.textSecondary, fontSize: tokens.typography.fontSizeSm }}>
            {region}
          </p>
          <p style={{ margin: 0, color: tokens.colors.textMuted, fontSize: tokens.typography.fontSizeXs }}>
            {format}
            {season ? ` · Temp. ${season}` : ''}
          </p>
        </div>
      </div>

      {currentChampion?.championName && (
        <p
          style={{
            margin: `${tokens.spacing.md} 0 0`,
            fontSize: tokens.typography.fontSizeSm,
            color: tokens.colors.textSecondary,
          }}
        >
          Último campeón:{' '}
          <strong style={{ color: '#4FC3F7' }}>{currentChampion.championName}</strong>
          {currentChampion.year ? ` (${currentChampion.year})` : ''}
        </p>
      )}

      <button
        type="button"
        onClick={() => onViewCompetition?.()}
        style={{
          marginTop: tokens.spacing.md,
          width: '100%',
          padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
          borderRadius: tokens.radius.md,
          border: '1px solid rgba(79, 195, 247, 0.5)',
          backgroundColor: 'rgba(79, 195, 247, 0.12)',
          color: '#4FC3F7',
          fontSize: tokens.typography.fontSizeMd,
          fontWeight: tokens.typography.fontWeightSemibold,
          cursor: 'pointer',
        }}
      >
        Ver competición
      </button>
    </div>
  );
}
