/**
 * Sistema CID adaptado para análisis de grupos en competiciones tipo copa
 * Genera conclusiones profesionales sobre la situación de cada grupo
 */

import { generateInsights } from './generateInsights';

/**
 * Genera conclusiones de análisis para un grupo específico
 * @param {Array} standings - Tabla de posiciones del grupo
 * @param {Array} matches - Partidos del grupo
 * @param {string} groupName - Nombre del grupo
 * @returns {Object} Conclusiones del grupo
 */
export function generateGroupAnalysis(standings, matches, groupName) {
  if (!standings || standings.length === 0) {
    return {
      conclusiones: [],
      resumenEjecutivo: [],
      conclusionFinal: null
    };
  }

  const conclusiones = [];
  const resumenEjecutivo = [];

  // Análisis 1: Equipos clasificados
  const clasificados = standings.slice(0, 2); // Primeros 2 clasifican típicamente
  if (clasificados.length >= 2) {
    const primerLugar = clasificados[0];
    const segundoLugar = clasificados[1];
    
    conclusiones.push({
      tipo: 'ventaja',
      icono: '🏆',
      texto: `${primerLugar.team?.name || 'Equipo'} lidera el ${groupName} con ${primerLugar.points || 0} puntos, mostrando dominio en la fase de grupos. ${segundoLugar.team?.name || 'Equipo'} ocupa el segundo lugar con ${segundoLugar.points || 0} puntos, posicionándose para la clasificación.`
    });

    resumenEjecutivo.push(`${primerLugar.team?.name || 'Equipo'} lidera el ${groupName} con ${primerLugar.points || 0} puntos.`);
  }

  // Análisis 2: Diferencia de puntos
  if (standings.length >= 2) {
    const diferenciaPuntos = (standings[0].points || 0) - (standings[1].points || 0);
    if (diferenciaPuntos >= 4) {
      conclusiones.push({
        tipo: 'ventaja',
        icono: '📊',
        texto: `El líder del ${groupName} tiene una ventaja de ${diferenciaPuntos} puntos sobre el segundo lugar, lo que sugiere un dominio claro en la fase de grupos.`
      });
    } else if (diferenciaPuntos <= 1) {
      conclusiones.push({
        tipo: 'tendencia',
        icono: '⚖️',
        texto: `El ${groupName} está muy igualado, con solo ${diferenciaPuntos} punto de diferencia entre el primero y segundo lugar. La clasificación se definirá en los últimos partidos.`
      });
    }
  }

  // Análisis 3: Equipos en lucha por clasificación
  if (standings.length >= 3) {
    const tercerLugar = standings[2];
    const segundoLugar = standings[1];
    const diferencia = (segundoLugar.points || 0) - (tercerLugar.points || 0);
    
    if (diferencia <= 3) {
      conclusiones.push({
        tipo: 'alerta',
        icono: '⚠️',
        texto: `${tercerLugar.team?.name || 'Equipo'} está a solo ${diferencia} puntos del segundo lugar, manteniendo viva la lucha por la clasificación en el ${groupName}.`
      });
    }
  }

  // Análisis 4: Rendimiento ofensivo del grupo
  const promedioGoles = standings.reduce((sum, team) => {
    const goalsFor = team.all?.goals?.for || team.goalsFor || 0;
    return sum + goalsFor;
  }, 0) / standings.length;

  if (promedioGoles > 1.5) {
    conclusiones.push({
      tipo: 'tendencia',
      icono: '⚽',
      texto: `El ${groupName} muestra un promedio de ${promedioGoles.toFixed(1)} goles a favor por equipo, indicando un grupo ofensivo con equipos que generan peligro.`
    });
  }

  // Análisis 5: Equilibrio del grupo
  const puntos = standings.map(team => team.points || 0);
  const diferenciaMaxMin = Math.max(...puntos) - Math.min(...puntos);
  
  if (diferenciaMaxMin <= 6) {
    conclusiones.push({
      tipo: 'tendencia',
      icono: '⚖️',
      texto: `El ${groupName} presenta un equilibrio competitivo, con solo ${diferenciaMaxMin} puntos de diferencia entre el primero y último lugar. Todos los equipos mantienen opciones de clasificación.`
    });
  }

  // Generar resumen ejecutivo
  const primerLugar = standings[0];
  const segundoLugar = standings[1];
  
  if (clasificados.length >= 2) {
    resumenEjecutivo.push(`${segundoLugar.team?.name || 'Equipo'} ocupa el segundo lugar con ${segundoLugar.points || 0} puntos.`);
  }

  if (standings.length >= 3) {
    const tercerLugar = standings[2];
    resumenEjecutivo.push(`${tercerLugar.team?.name || 'Equipo'} está en tercer lugar con ${tercerLugar.points || 0} puntos, manteniendo opciones de clasificación.`);
  }

  // Conclusión final
  let conclusionFinal = `El ${groupName} muestra una situación `;
  
  if (diferenciaMaxMin <= 6) {
    conclusionFinal += `muy equilibrada, donde todos los equipos mantienen opciones de clasificación. `;
  } else {
    conclusionFinal += `con un claro favorito en ${primerLugar.team?.name || 'el líder'}, que domina con ${primerLugar.points || 0} puntos. `;
  }
  
  conclusionFinal += `${primerLugar.team?.name || 'El líder'} y ${segundoLugar.team?.name || 'el segundo lugar'} son los principales candidatos a clasificar, aunque la lucha por el segundo puesto sigue abierta.`;

  return {
    conclusiones: conclusiones.slice(0, 5), // Máximo 5 conclusiones
    resumenEjecutivo: resumenEjecutivo.slice(0, 4), // Máximo 4 puntos
    conclusionFinal: conclusionFinal
  };
}

/**
 * Genera análisis comparativo entre equipos del mismo grupo
 * @param {Object} team1 - Datos del equipo 1
 * @param {Object} team2 - Datos del equipo 2
 * @param {string} groupName - Nombre del grupo
 * @returns {Object} Conclusiones comparativas
 */
export function generateGroupTeamComparison(team1, team2, groupName) {
  const conclusiones = [];

  // Comparar puntos
  const puntos1 = team1.points || 0;
  const puntos2 = team2.points || 0;
  const diferencia = Math.abs(puntos1 - puntos2);

  if (diferencia >= 4) {
    const mejor = puntos1 > puntos2 ? team1 : team2;
    conclusiones.push({
      tipo: 'ventaja',
      icono: '📊',
      texto: `${mejor.team?.name || 'Equipo'} tiene una ventaja de ${diferencia} puntos sobre su rival en el ${groupName}, mostrando mejor rendimiento en la fase de grupos.`
    });
  } else if (diferencia <= 1) {
    conclusiones.push({
      tipo: 'tendencia',
      icono: '⚖️',
      texto: `Ambos equipos están muy igualados en el ${groupName}, con solo ${diferencia} punto de diferencia. El enfrentamiento directo será clave para la clasificación.`
    });
  }

  // Comparar diferencia de goles
  const dg1 = (team1.all?.goals?.for || 0) - (team1.all?.goals?.against || 0);
  const dg2 = (team2.all?.goals?.for || 0) - (team2.all?.goals?.against || 0);

  if (Math.abs(dg1 - dg2) >= 5) {
    const mejor = dg1 > dg2 ? team1 : team2;
    conclusiones.push({
      tipo: 'ventaja',
      icono: '⚽',
      texto: `${mejor.team?.name || 'Equipo'} presenta una diferencia de goles superior (${dg1 > dg2 ? dg1 : dg2}), reflejando un mejor balance ofensivo-defensivo en el ${groupName}.`
    });
  }

  return conclusiones;
}
