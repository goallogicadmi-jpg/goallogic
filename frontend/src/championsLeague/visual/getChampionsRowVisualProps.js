/**
 * Obtener propiedades visuales para una fila de Champions League
 * Combina fase del equipo con estilos visuales
 */

import { getChampionsZoneStyle } from './championsZoneStyles';

/**
 * Obtener propiedades visuales completas para una fila
 * @param {object} team - Equipo con stage asignado
 * @returns {object} Propiedades visuales:
 *   - leftBarColor: color de barra lateral
 *   - backgroundColor: color de fondo
 *   - backgroundGradient: gradiente de fondo (opcional)
 *   - className: clase CSS base
 *   - tooltip: texto del tooltip
 *   - icon: icono opcional
 */
export function getChampionsRowVisualProps(team) {
  if (!team || !team.stage) {
    console.warn('⚠️ [getChampionsRowVisualProps] Equipo sin stage:', team);
    return {
      leftBarColor: null,
      backgroundColor: null,
      backgroundGradient: null,
      className: "",
      tooltip: "",
      icon: null
    };
  }
  
  const zoneStyle = getChampionsZoneStyle(team.stage);
  
  return {
    leftBarColor: zoneStyle.leftBarColor,
    backgroundColor: zoneStyle.backgroundColor,
    backgroundGradient: zoneStyle.backgroundGradient,
    className: zoneStyle.className,
    tooltip: zoneStyle.tooltip,
    icon: zoneStyle.icon,
    // Información adicional
    stage: team.stage,
    position: team.position
  };
}

/**
 * Obtener clases CSS completas para una fila
 * @param {object} team - Equipo con stage asignado
 * @param {Array<string>} additionalClasses - Clases adicionales (opcional)
 * @returns {string} Clases CSS concatenadas
 */
export function getChampionsRowClasses(team, additionalClasses = []) {
  const visualProps = getChampionsRowVisualProps(team);
  const classes = ["team-row", "champions-row"];
  
  if (visualProps.className) {
    classes.push(visualProps.className);
  }
  
  if (Array.isArray(additionalClasses) && additionalClasses.length > 0) {
    classes.push(...additionalClasses);
  }
  
  return classes.join(" ");
}
