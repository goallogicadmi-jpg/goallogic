/**
 * Genera un array de 7 fechas consecutivas (3 antes, hoy, 3 después)
 * @returns {Array} Array de objetos con información de fechas
 */
export function getDateRange() {
  // La UI de "Partidos" es por día *local* (lo que el usuario percibe como "hoy").
  // La API trabaja con fechas UTC, así que el fetch debe cubrir 1–2 días UTC y
  // luego filtrar por rango local (ver helpers más abajo).
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
  // Fecha "hoy" en calendario local.
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convierte YYYY-MM-DD a rango [inicio, fin] del día *local*.
 * @param {string} dateStringLocal
 */
export function getLocalDayRange(dateStringLocal) {
  const [y, m, d] = String(dateStringLocal).split("-").map((v) => Number(v));
  const start = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  const end = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
  return { start, end };
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * Fecha UTC YYYY-MM-DD para un Date.
 * @param {Date} date
 */
export function toUtcDateString(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/**
 * Para un día local, devuelve qué YYYY-MM-DD (UTC) hay que pedir a la API.
 * En la mayoría de TZs será 1 o 2 fechas UTC.
 * @param {string} dateStringLocal
 */
export function getUtcDatesToFetchForLocalDay(dateStringLocal) {
  const { start, end } = getLocalDayRange(dateStringLocal);
  const startUtc = toUtcDateString(start);
  const endUtc = toUtcDateString(end);
  return startUtc === endUtc ? [startUtc] : [startUtc, endUtc];
}