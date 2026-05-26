import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

/**
 * Navegación al flujo GoalLogic Predic desde una tarjeta de partido.
 * Sin sesión muestra toast; con sesión envía equipos vía location.state.
 */
export function usePrediccionesNavigation(defaultDomain = 'club', defaultLeagueId = null) {
  const navigate = useNavigate();
  const { isAuthenticated } = useUser();
  const [showSessionToast, setShowSessionToast] = useState(false);

  const handlePrediccionesClick = useCallback(
    (partido) => {
      if (!isAuthenticated) {
        setShowSessionToast(true);
        return;
      }

      const homeTeam = partido?.teams?.home;
      const awayTeam = partido?.teams?.away;
      const matchDomain = partido?.domain || defaultDomain;
      const leagueId = partido?.league?.id ?? defaultLeagueId;

      if (!homeTeam || !awayTeam) {
        return;
      }

      navigate('/predicciones', {
        state: {
          domain: matchDomain,
          leagueId,
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
    [navigate, isAuthenticated, defaultDomain, defaultLeagueId]
  );

  return {
    handlePrediccionesClick,
    showSessionToast,
    setShowSessionToast,
  };
}
