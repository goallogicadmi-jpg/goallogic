import { tokens } from '../../styles/tokens';

const ICONS = {
  arrow: '→',
  chart: '▤',
  history: '◷',
  table: '☰',
  matches: '⚽',
  compare: '⇄',
};

/**
 * Botón compacto tipo enlace para navegación contextual entre tabs.
 */
export default function CompetitionLinkButton({
  children,
  onClick,
  icon = 'arrow',
  disabled = false,
  style,
}) {
  const symbol = ICONS[icon] || ICONS.arrow;

  return (
    <button
      type="button"
      className="competition-link-button"
      onClick={onClick}
      disabled={disabled || !onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: tokens.spacing.xs,
        padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
        marginTop: tokens.spacing.sm,
        border: 'none',
        borderRadius: tokens.radius.sm,
        background: 'transparent',
        color: '#4FC3F7',
        fontSize: tokens.typography.fontSizeSm,
        fontWeight: tokens.typography.fontWeightMedium,
        cursor: disabled || !onClick ? 'default' : 'pointer',
        opacity: disabled || !onClick ? 0.5 : 1,
        textDecoration: 'underline',
        textUnderlineOffset: '2px',
        ...style,
      }}
    >
      <span aria-hidden="true">{symbol}</span>
      {children}
    </button>
  );
}
