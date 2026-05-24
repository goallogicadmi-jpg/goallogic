/**
 * Calcula estadísticas avanzadas desde los fixtures o últimos partidos de un equipo
 * @param {Array} allFixtures - Array de fixtures o últimos partidos
 * @param {number|string} teamId - ID del equipo (opcional, solo necesario si los fixtures tienen estructura completa)
 * @returns {Object|null} - Objeto con estadísticas avanzadas o null si no hay datos
 */
export const calculateAdvancedStats = (allFixtures, teamId = null) => {
  if (!Array.isArray(allFixtures) || allFixtures.length === 0) return null;

  const teamIdNum = teamId ? parseInt(teamId) : null;
  let totalGoalsFor = 0;
  let totalGoalsAgainst = 0;
  let totalGoals = 0;
  let cleanSheets = 0; // Portería a cero
  let failedToScore = 0; // Sin anotar
  let totalMatches = 0;
  
  // Contadores para Over/Under
  const overUnder = {
    over05: 0, // Más de 0.5 goles
    over15: 0, // Más de 1.5 goles
    over25: 0, // Más de 2.5 goles
    over35: 0, // Más de 3.5 goles
    under05: 0, // Menos de 0.5 goles
    under15: 0, // Menos de 1.5 goles
    under25: 0, // Menos de 2.5 goles
    under35: 0  // Menos de 3.5 goles
  };

  allFixtures.forEach(fixture => {
    let goalsFor = 0;
    let goalsAgainst = 0;
    let totalMatchGoals = 0;

    // Si el fixture tiene estructura completa (teams, goals)
    if (fixture?.teams && fixture?.goals && teamIdNum !== null) {
      const isHome = fixture.teams.home?.id === teamIdNum;
      goalsFor = isHome ? (fixture.goals?.home ?? 0) : (fixture.goals?.away ?? 0);
      goalsAgainst = isHome ? (fixture.goals?.away ?? 0) : (fixture.goals?.home ?? 0);
      totalMatchGoals = goalsFor + goalsAgainst;
    } 
    // Si el fixture tiene estructura simplificada (golesFavor, golesContra)
    else if (fixture?.golesFavor !== undefined && fixture?.golesContra !== undefined) {
      goalsFor = fixture.golesFavor ?? 0;
      goalsAgainst = fixture.golesContra ?? 0;
      totalMatchGoals = goalsFor + goalsAgainst;
    } 
    // Si no tiene estructura válida, saltar
    else {
      return;
    }

    totalGoalsFor += goalsFor;
    totalGoalsAgainst += goalsAgainst;
    totalGoals += totalMatchGoals;
    totalMatches++;

    // Portería a cero (no recibieron goles)
    if (goalsAgainst === 0) cleanSheets++;
    
    // Sin anotar (no anotaron goles)
    if (goalsFor === 0) failedToScore++;

    // Over/Under
    if (totalMatchGoals > 0.5) overUnder.over05++;
    if (totalMatchGoals > 1.5) overUnder.over15++;
    if (totalMatchGoals > 2.5) overUnder.over25++;
    if (totalMatchGoals > 3.5) overUnder.over35++;
    
    if (totalMatchGoals < 0.5) overUnder.under05++;
    if (totalMatchGoals < 1.5) overUnder.under15++;
    if (totalMatchGoals < 2.5) overUnder.under25++;
    if (totalMatchGoals < 3.5) overUnder.under35++;
  });

  if (totalMatches === 0) return null;

  // Calcular promedios
  const avgGoalsPerMatch = (totalGoalsFor / totalMatches).toFixed(2);
  const avgGoalsAgainstPerMatch = (totalGoalsAgainst / totalMatches).toFixed(2);
  const avgTotalGoalsPerMatch = (totalGoals / totalMatches).toFixed(2);

  // Calcular porcentajes de Over/Under
  const overUnderPercentages = {
    over05: ((overUnder.over05 / totalMatches) * 100).toFixed(1),
    over15: ((overUnder.over15 / totalMatches) * 100).toFixed(1),
    over25: ((overUnder.over25 / totalMatches) * 100).toFixed(1),
    over35: ((overUnder.over35 / totalMatches) * 100).toFixed(1),
    under05: ((overUnder.under05 / totalMatches) * 100).toFixed(1),
    under15: ((overUnder.under15 / totalMatches) * 100).toFixed(1),
    under25: ((overUnder.under25 / totalMatches) * 100).toFixed(1),
    under35: ((overUnder.under35 / totalMatches) * 100).toFixed(1)
  };

  // Goles por minuto (aproximado: asumiendo 90 minutos por partido)
  const totalMinutes = totalMatches * 90;
  const goalsPerMinute = totalMinutes > 0 ? (totalGoalsFor / totalMinutes).toFixed(4) : "0.0000";
  const goalsPerMinuteAgainst = totalMinutes > 0 ? (totalGoalsAgainst / totalMinutes).toFixed(4) : "0.0000";

  return {
    avgGoalsPerMatch,
    avgGoalsAgainstPerMatch,
    avgTotalGoalsPerMatch,
    goalsPerMinute,
    goalsPerMinuteAgainst,
    cleanSheets,
    cleanSheetsPercentage: ((cleanSheets / totalMatches) * 100).toFixed(1),
    failedToScore,
    failedToScorePercentage: ((failedToScore / totalMatches) * 100).toFixed(1),
    overUnder: overUnderPercentages,
    totalMatches
  };
};
