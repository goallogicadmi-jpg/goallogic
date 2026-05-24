/**
 * Estilos visuales exclusivos para Champions League
 * Define colores, clases CSS y tooltips para cada fase
 */

export const championsZoneStyles = {
  direct_round_of_16: {
    className: "champions-direct",
    leftBarColor: "#1A2A80",
    backgroundColor: "rgba(26, 42, 128, 0.12)",
    backgroundGradient: "linear-gradient(90deg, rgba(26, 42, 128, 0.15) 0%, rgba(26, 42, 128, 0.05) 100%)",
    tooltip: "Clasificado directo a Octavos de Final",
    icon: "⭐",
    priority: 1
  },
  
  playoff: {
    className: "champions-playoff",
    leftBarColor: "#3A6DFF",
    backgroundColor: "rgba(58, 109, 255, 0.12)",
    backgroundGradient: "linear-gradient(90deg, rgba(58, 109, 255, 0.15) 0%, rgba(58, 109, 255, 0.05) 100%)",
    tooltip: "Zona de Playoff",
    icon: "⚡",
    priority: 2
  },
  
  eliminated: {
    className: "champions-eliminated",
    leftBarColor: "#9E9E9E",
    backgroundColor: "rgba(158, 158, 158, 0.08)",
    backgroundGradient: "linear-gradient(90deg, rgba(158, 158, 158, 0.10) 0%, rgba(158, 158, 158, 0.03) 100%)",
    tooltip: "Eliminado",
    icon: null,
    priority: 3
  }
};

/**
 * Obtener estilos para una fase específica
 * @param {string} stage - Fase: "direct_round_of_16", "playoff", "eliminated"
 * @returns {object} Estilos de la fase o estilos por defecto
 */
export function getChampionsZoneStyle(stage) {
  return championsZoneStyles[stage] || championsZoneStyles.eliminated;
}
