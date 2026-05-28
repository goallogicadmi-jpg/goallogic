/**
 * Genera un array de 7 fechas consecutivas (3 antes, hoy, 3 después)
 * @returns {Array} Array de objetos con información de fechas
 */
export function getDateRange() {
  // API-Football trabaja con fechas en UTC. Para evitar bugs de timezone
  // (p.ej. partidos del 27 apareciendo como 26), generamos el rango en UTC.
  const now = new Date();
  const todayUtcMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const dates = [];
  
  for (let i = -3; i <= 3; i++) {
    const date = new Date(todayUtcMidnight);
    date.setUTCDate(todayUtcMidnight.getUTCDate() + i);
    
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    
    dates.push({
      date: date,
      dateString: `${year}-${month}-${day}`, // YYYY-MM-DD para API
      display: `${day}/${month}`, // DD/MM para mostrar
      isToday: i === 0
    });
  }
  
  return dates;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function getTodayDateString() {
  // Importante: usar UTC para alinear con API-Football y evitar desfases.
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = String(today.getUTCMonth() + 1).padStart(2, '0');
  const day = String(today.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}