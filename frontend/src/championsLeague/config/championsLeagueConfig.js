/**
 * Configuración oficial del formato UEFA Champions League 2024+
 * 36 equipos en tabla única, clasificación por posiciones
 */

export const championsLeagueConfig = {
  totalTeams: 36,
  
  // Clasificación directa a Octavos de Final (puestos 1-8)
  directSpots: {
    from: 1,
    to: 8
  },
  
  // Zona de Playoff (puestos 9-24)
  playoffSpots: {
    from: 9,
    to: 24
  },
  
  // Equipos eliminados (puestos 25-36)
  eliminatedSpots: {
    from: 25,
    to: 36
  },
  
  // Criterios de desempate (en orden de prioridad)
  tiebreakers: [
    "points",        // 1. Puntos
    "goalDifference", // 2. Diferencia de gol
    "goalsFor"       // 3. Goles a favor
  ],
  
  // Configuración de fases
  phases: {
    direct_round_of_16: {
      name: "Clasificado directo a Octavos de Final",
      positions: [1, 2, 3, 4, 5, 6, 7, 8]
    },
    playoff: {
      name: "Zona de Playoff",
      positions: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
    },
    eliminated: {
      name: "Eliminado",
      positions: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36]
    }
  }
};
