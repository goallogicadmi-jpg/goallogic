import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeagueFixtures } from '../../api/api';
import { useUser } from '../../context/UserContext';
import {
  SESSION_REQUIRED_PREDICCIONES_TOAST_MESSAGE,
  SESSION_REQUIRED_TOAST_DURATION_MS,
} from '../../constants/sessionMessages';
import PartidoCard from '../Partidos/PartidoCard';
import MatchCenter from '../Partidos/MatchCenter';
import Toast from '../Toast';
import { tokens } from '../../styles/tokens';
import { COMPETITION_TAB_IDS } from './competitionTabIds';
import CompetitionLinkButton from './CompetitionLinkButton';
import '../../styles/partidos.css';

const sectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing.lg,
};

const blockStyle = {
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  border: '1px solid rgba(79, 195, 247, 0.15)',
  padding: tokens.spacing.lg,
};

const titleStyle = {
  margin: `0 0 ${tokens.spacing.md}`,
  fontSize: tokens.typography.fontSizeLg,
  fontWeight: tokens.typography.fontWeightSemibold,
  color: tokens.colors.textPrimary,
};

const listStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing.md,
};

const emptyStyle = {
  margin: 0,
  color: tokens.colors.textSecondary,
  fontSize: tokens.typography.fontSizeMd,
};

const loadingStyle = {
  textAlign: 'center',
  padding: tokens.spacing.xl,
  color: '#b0b0b0',
};

/**
 * Próximos y últimos partidos de la competición (API fixtures/league).
 */
export default function CompetitionFixturesSection({
  leagueId,
  season,
  domain = 'club',
  nextCount = 10,
  lastCount = 10,
  onNavigateToTab,
}) {
  const navigate = useNavigate();
  const { isAuthenticated } = useUser();
  const [fixtures, setFixtures] = useState({ proximos: [], pasados: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [partidoSeleccionado, setPartidoSeleccionado] = useState(null);
  const [showSessionToast, setShowSessionToast] = useState(false);

  useEffect(() => {
    if (!leagueId || !season) {
      setFixtures({ proximos: [], pasados: [] });
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getLeagueFixtures(leagueId, season, {
          next: nextCount,
          last: lastCount,
        });
        if (cancelled) return;
        setFixtures({
          proximos: Array.isArray(data?.proximos) ? data.proximos : [],
          pasados: Array.isArray(data?.pasados) ? data.pasados : [],
        });
      } catch (err) {
        console.error('Error cargando fixtures de competición:', err);
        if (!cancelled) {
          setError('No se pudieron cargar los partidos de esta competición.');
          setFixtures({ proximos: [], pasados: [] });
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
  }, [leagueId, season, nextCount, lastCount]);

  const handlePartidoClick = useCallback((partido) => {
    setPartidoSeleccionado(partido);
  }, []);

  const handlePrediccionesClick = useCallback(
    (partido) => {
      if (!isAuthenticated) {
        setShowSessionToast(true);
        return;
      }

      const homeTeam = partido?.teams?.home;
      const awayTeam = partido?.teams?.away;
      const matchDomain = partido?.domain || domain;

      if (!homeTeam || !awayTeam) {
        return;
      }

      navigate('/predicciones', {
        state: {
          domain: matchDomain,
          leagueId: partido.league?.id ?? leagueId,
          fixtureId: partido.fixture?.id ?? null,
          fromMatchesRoute: window.location.pathname,
          homeTeam: {
            id: homeTeam.id,
            name: homeTeam.name,
            logo: homeTeam.logo,
          },
          awayTeam: {
            id: awayTeam.id,
            name: awayTeam.name,
            logo: awayTeam.logo,
          },
        },
      });
    },
    [navigate, domain, leagueId, isAuthenticated]
  );

  if (loading) {
    return <p style={loadingStyle}>Cargando partidos...</p>;
  }

  if (error) {
    return (
      <div style={blockStyle}>
        <p style={{ ...emptyStyle, color: tokens.colors.accentNegative }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={sectionStyle}>
      <section style={blockStyle}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.md,
          }}
        >
          <h3 style={{ ...titleStyle, margin: 0 }}>Próximos partidos</h3>
          {fixtures.proximos.length > 0 && (
            <CompetitionLinkButton
              icon="history"
              style={{ marginTop: 0 }}
              onClick={() => onNavigateToTab?.(COMPETITION_TAB_IDS.HISTORIAL)}
            >
              Ver historial del torneo
            </CompetitionLinkButton>
          )}
        </div>
        {fixtures.proximos.length === 0 ? (
          <p style={emptyStyle}>No hay partidos programados próximamente.</p>
        ) : (
          <div style={listStyle}>
            {fixtures.proximos.map((partido) => (
              <PartidoCard
                key={partido.fixture?.id || `${partido.teams?.home?.id}-${partido.teams?.away?.id}-next`}
                partido={partido}
                domain={domain}
                onClick={() => handlePartidoClick(partido)}
                onPrediccionesClick={handlePrediccionesClick}
              />
            ))}
          </div>
        )}
      </section>

      <section style={blockStyle}>
        <h3 style={titleStyle}>Últimos partidos</h3>
        {fixtures.pasados.length === 0 ? (
          <p style={emptyStyle}>No hay resultados recientes disponibles.</p>
        ) : (
          <div style={listStyle}>
            {fixtures.pasados.map((partido) => (
              <PartidoCard
                key={partido.fixture?.id || `${partido.teams?.home?.id}-${partido.teams?.away?.id}-last`}
                partido={partido}
                domain={domain}
                onClick={() => handlePartidoClick(partido)}
                onPrediccionesClick={handlePrediccionesClick}
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
