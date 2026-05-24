import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { getLeagueFixtures } from '../../api/api';
import PartidoCard from '../Partidos/PartidoCard';
import MatchCenter from '../Partidos/MatchCenter';
import OfficialKnockoutBracket from '../CupCompetition/OfficialKnockoutBracket';
import { tokens } from '../../styles/tokens';
import '../../styles/partidos.css';

const cardStyle = {
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  border: '1px solid rgba(79, 195, 247, 0.15)',
  padding: tokens.spacing.lg,
  marginBottom: tokens.spacing.lg,
};

const KNOCKOUT_KEYWORDS = [
  'round of 16',
  'quarter',
  'semi',
  'final',
  'octavos',
  'cuartos',
  'semifinal',
  'eliminatoria',
  'playoff',
];

function isKnockoutFixture(partido) {
  const round = String(partido?.league?.round || '').toLowerCase();
  return KNOCKOUT_KEYWORDS.some((keyword) => round.includes(keyword));
}

/**
 * Eliminatoria directa para ligas con playoffs (p. ej. Liga BetPlay desde 2026).
 */
export default function LeagueKnockoutSection({ competitionId, season, domain = 'club' }) {
  const [bracket, setBracket] = useState(null);
  const [bracketLoading, setBracketLoading] = useState(true);
  const [fixtures, setFixtures] = useState({ proximos: [], pasados: [] });
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [partidoSeleccionado, setPartidoSeleccionado] = useState(null);

  useEffect(() => {
    if (!competitionId || !season) return;

    let cancelled = false;

    async function loadBracket() {
      setBracketLoading(true);
      try {
        const response = await axios.get('/api/estadisticas/torneo', {
          params: { leagueId: competitionId, season },
        });
        if (cancelled) return;
        setBracket(response.data?.bracket || null);
      } catch (err) {
        console.error('Error cargando bracket de liga:', err);
        if (!cancelled) setBracket(null);
      } finally {
        if (!cancelled) setBracketLoading(false);
      }
    }

    loadBracket();
    return () => {
      cancelled = true;
    };
  }, [competitionId, season]);

  useEffect(() => {
    if (!competitionId || !season) return;

    let cancelled = false;

    async function loadFixtures() {
      setFixturesLoading(true);
      try {
        const data = await getLeagueFixtures(competitionId, season, { next: 20, last: 40 });
        if (cancelled) return;
        setFixtures({
          proximos: Array.isArray(data?.proximos) ? data.proximos : [],
          pasados: Array.isArray(data?.pasados) ? data.pasados : [],
        });
      } catch (err) {
        console.error('Error cargando fixtures KO:', err);
        if (!cancelled) setFixtures({ proximos: [], pasados: [] });
      } finally {
        if (!cancelled) setFixturesLoading(false);
      }
    }

    loadFixtures();
    return () => {
      cancelled = true;
    };
  }, [competitionId, season]);

  const knockoutFixtures = useMemo(() => {
    const combined = [...fixtures.pasados, ...fixtures.proximos];
    const filtered = combined.filter(isKnockoutFixture);
    return filtered.length > 0 ? filtered : combined;
  }, [fixtures]);

  const handlePartidoClick = useCallback((partido) => {
    setPartidoSeleccionado(partido);
  }, []);

  if (bracketLoading) {
    return <p style={{ textAlign: 'center', color: tokens.colors.textSecondary }}>Cargando eliminatoria...</p>;
  }

  return (
    <div>
      {bracket ? (
        <div style={cardStyle}>
          <OfficialKnockoutBracket bracket={bracket} />
        </div>
      ) : (
        <div style={cardStyle}>
          <p style={{ margin: 0, color: tokens.colors.textSecondary }}>
            El cuadro de eliminatoria se mostrará cuando estén definidos los cruces de cuartos de final.
          </p>
        </div>
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
          Partidos de eliminatoria
        </h3>
        {fixturesLoading ? (
          <p style={{ margin: 0, color: tokens.colors.textSecondary }}>Cargando partidos...</p>
        ) : knockoutFixtures.length === 0 ? (
          <p style={{ margin: 0, color: tokens.colors.textSecondary }}>
            No hay partidos de eliminatoria disponibles en este momento.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
            {knockoutFixtures.map((partido) => (
              <PartidoCard
                key={partido.fixture?.id || `${partido.teams?.home?.id}-${partido.teams?.away?.id}`}
                partido={partido}
                domain={domain}
                onClick={() => handlePartidoClick(partido)}
              />
            ))}
          </div>
        )}
      </section>

      {partidoSeleccionado && (
        <MatchCenter
          partido={partidoSeleccionado}
          domain={domain}
          onClose={() => setPartidoSeleccionado(null)}
        />
      )}
    </div>
  );
}
