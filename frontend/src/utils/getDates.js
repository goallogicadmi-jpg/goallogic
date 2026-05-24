/**
 * Genera un array de 7 fechas consecutivas (3 antes, hoy, 3 después)
 * @returns {Array} Array de objetos con información de fechas
 */
export function getDateRange() {
  const today = new Date();
  const dates = [];
  
  for (let i = -3; i <= 3; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
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
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}