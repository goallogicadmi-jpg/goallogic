import { useCallback, useState } from 'react';
import { tokens } from '../../styles/tokens';
import PartidoCard from '../Partidos/PartidoCard';
import MatchCenter from '../Partidos/MatchCenter';

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

function formatDateTime(iso) {
  if (!iso) return { date: '—', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '—', time: '' };
  return {
    date: d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
  };
}

function isFinished(partido) {
  const status = partido?.fixture?.status?.short || '';
  return ['FT', 'AET', 'PEN'].includes(status);
}

/**
 * Próximo partido (o último resultado) del torneo en el hub.
 */
export default function CompetitionHubNextMatch({ partido, domain = 'club', loading }) {
  const [partidoSeleccionado, setPartidoSeleccionado] = useState(null);
  const partidoCardDomain = domain === 'selection' ? 'selection' : 'club';

  const handleClick = useCallback((p) => {
    setPartidoSeleccionado(p);
  }, []);

  if (loading) {
    return (
      <div style={cardStyle}>
        <p style={{ margin: 0, color: tokens.colors.textSecondary, fontSize: tokens.typography.fontSizeSm }}>
          Cargando partido...
        </p>
      </div>
    );
  }

  if (!partido) {
    return (
      <div style={cardStyle}>
        <h4 style={titleStyle}>Próximo partido</h4>
        <p style={{ margin: 0, color: tokens.colors.textSecondary, fontSize: tokens.typography.fontSizeSm }}>
          No hay partidos disponibles.
        </p>
      </div>
    );
  }

  const finished = isFinished(partido);
  const { date, time } = formatDateTime(partido.fixture?.date);
  const home = partido.teams?.home?.name || 'Local';
  const away = partido.teams?.away?.name || 'Visitante';
  const gh = partido.goals?.home;
  const ga = partido.goals?.away;
  const hasScore = gh != null && ga != null;

  return (
    <div style={cardStyle}>
      <h4 style={titleStyle}>{finished ? 'Último resultado' : 'Próximo partido'}</h4>
      <p style={{ margin: `0 0 ${tokens.spacing.sm}`, color: tokens.colors.textSecondary, fontSize: tokens.typography.fontSizeSm }}>
        {date}
        {time ? ` · ${time}` : ''}
      </p>
      {hasScore && (
        <p
          style={{
            margin: `0 0 ${tokens.spacing.md}`,
            fontSize: tokens.typography.fontSizeLg,
            fontWeight: tokens.typography.fontWeightBold,
            color: '#4FC3F7',
          }}
        >
          {home} {gh} - {ga} {away}
        </p>
      )}
      <PartidoCard partido={partido} domain={partidoCardDomain} onClick={() => handleClick(partido)} />
      {partidoSeleccionado && (
        <MatchCenter
          partido={partidoSeleccionado}
          domain={partidoCardDomain}
          onClose={() => setPartidoSeleccionado(null)}
        />
      )}
    </div>
  );
}
