import { buildSeasonStandingStats, formatStatDisplay } from '../utils/statDisplay';

const labelStyleCompact = {
  color: '#64748b',
  fontSize: '11px',
  marginBottom: '2px',
};

const valueStyleCompact = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '600',
};

const labelStyleDefault = {
  color: '#64748b',
  fontSize: '14px',
  marginBottom: '4px',
};

const valueStyleDefault = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: '600',
};

/**
 * Grid de estadísticas de temporada (clasificación). Oculta métricas sin dato.
 */
export default function SeasonStandingsStats({
  standingsRow = {},
  variant = 'default',
}) {
  const items = buildSeasonStandingStats(standingsRow);
  const isCompact = variant === 'compact';

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: isCompact
          ? 'repeat(auto-fit, minmax(120px, 1fr))'
          : 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: isCompact ? '10px' : '16px',
      }}
    >
      {items.map((item) => (
        <div key={item.label}>
          <p style={isCompact ? labelStyleCompact : labelStyleDefault}>{item.label}</p>
          <p style={isCompact ? valueStyleCompact : valueStyleDefault}>
            {formatStatDisplay(item.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
