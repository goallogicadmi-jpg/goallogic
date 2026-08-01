/**
 * Utilidades compartidas para listados de últimos partidos (Clubes y Predicciones).
 */

export function getMatchColor(fixture, teamId) {
  if (!fixture?.teams || !teamId || !fixture?.goals) {
    return 'rgba(241, 245, 249, 0.25)';
  }

  const isLocal = fixture.teams.home?.id === parseInt(teamId, 10);
  const goalsFor = isLocal ? (fixture.goals?.home ?? null) : (fixture.goals?.away ?? null);
  const goalsAgainst = isLocal ? (fixture.goals?.away ?? null) : (fixture.goals?.home ?? null);

  if (goalsFor === null || goalsAgainst === null) {
    return 'rgba(241, 245, 249, 0.25)';
  }

  if (goalsFor > goalsAgainst) return 'rgba(46, 204, 113, 0.25)';
  if (goalsFor === goalsAgainst) return 'rgba(241, 196, 15, 0.25)';
  return 'rgba(231, 76, 60, 0.25)';
}

export function formatFixtureDate(dateString) {
  if (!dateString) return 'N/D';

  try {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return 'N/D';
  }
}

export function buildFixtureMatchLabel(fixture, teamId, teamName = 'Equipo') {
  if (!fixture?.teams) return 'N/D';

  const isLocal = fixture.teams.home?.id === parseInt(teamId, 10);
  const rival = isLocal ? fixture.teams.away : fixture.teams.home;
  const rivalName = rival?.name || 'N/D';

  return isLocal ? `${teamName} vs ${rivalName}` : `${rivalName} vs ${teamName}`;
}
