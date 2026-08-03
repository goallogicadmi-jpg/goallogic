/**
 * Fechas para la vista "Partidos del día".
 * UI = calendario local del usuario. API-Football = fechas UTC (YYYY-MM-DD).
 */

const LIVE_FIXTURE_STATUSES = new Set([
  '1H', '2H', 'HT', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE',
]);

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Fecha local YYYY-MM-DD desde un Date (calendario del navegador).
 * @param {Date} date
 */
export function toLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
}

/**
 * Fecha UTC YYYY-MM-DD desde un Date.
 * @param {Date} date
 */
export function toUtcDateString(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Etiquetas para el selector premium de fechas en Partidos.
 * @param {{ date: Date, isToday: boolean }} dateObj
 */
export function getDateButtonLabels(dateObj) {
  const date = dateObj?.date instanceof Date ? dateObj.date : new Date();
  return {
    weekdayLabel: dateObj?.isToday ? 'Hoy' : WEEKDAY_SHORT[date.getDay()],
    dayNumber: pad2(date.getDate()),
    monthLabel: MONTH_SHORT[date.getMonth()],
  };
}

/**
 * Genera un array de 7 fechas consecutivas (3 antes, hoy, 3 después) en calendario local.
 * @returns {Array<{ date: Date, dateString: string, display: string, isToday: boolean, weekdayLabel: string, dayNumber: string, monthLabel: string }>}
 */
export function getDateRange() {
  const today = new Date();
  const dates = [];

  for (let i = -3; i <= 3; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dateString = toLocalDateString(date);
    const display = `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;
    const labels = getDateButtonLabels({ date, isToday: i === 0 });

    dates.push({
      date,
      dateString,
      display,
      isToday: i === 0,
      ...labels,
    });
  }

  return dates;
}

/**
 * Fecha de hoy en calendario local (única fuente de verdad para "Hoy").
 * @returns {string} YYYY-MM-DD
 */
export function getTodayDateString() {
  return toLocalDateString(new Date());
}

/**
 * Rango [inicio, fin] del día en hora local (00:00:00.000 – 23:59:59.999).
 * @param {string} dateStringLocal YYYY-MM-DD
 */
export function getLocalDayRange(dateStringLocal) {
  const [y, m, d] = String(dateStringLocal).split('-').map((v) => Number(v));
  const start = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  const end = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Todas las fechas UTC (YYYY-MM-DD) que cubren un día local completo.
 * @param {string} dateStringLocal
 */
export function getUtcDatesToFetchForLocalDay(dateStringLocal) {
  const { start, end } = getLocalDayRange(dateStringLocal);
  const utcDates = new Set();

  utcDates.add(toUtcDateString(start));
  utcDates.add(toUtcDateString(end));

  const stepMs = 6 * 60 * 60 * 1000;
  for (let t = start.getTime(); t <= end.getTime(); t += stepMs) {
    utcDates.add(toUtcDateString(new Date(t)));
  }

  return Array.from(utcDates).sort();
}

/**
 * @param {Object} fixture
 */
export function isLiveFixture(fixture) {
  const status = String(fixture?.fixture?.status?.short || '').toUpperCase();
  return LIVE_FIXTURE_STATUSES.has(status);
}

/**
 * @param {Object} fixture
 * @param {string} dateStringLocal
 */
export function isFixtureInLocalDay(fixture, dateStringLocal) {
  const iso = fixture?.fixture?.date;
  if (!iso) return false;

  const kickoffMs = new Date(iso).getTime();
  if (Number.isNaN(kickoffMs)) return false;

  const { start, end } = getLocalDayRange(dateStringLocal);
  const startMs = start.getTime();
  const endMs = end.getTime();

  // Único criterio: kickoff dentro del rango del día local.
  // Esto evita mezcla 26/27 y hace que UI y datos siempre coincidan.
  return kickoffMs >= startMs && kickoffMs <= endMs;
}

/**
 * @param {Array} fixtures
 */
export function dedupeFixtures(fixtures) {
  const byId = new Map();

  (fixtures || []).forEach((fixture) => {
    const id = fixture?.fixture?.id;
    if (id == null) return;
    const key = String(id);
    if (!byId.has(key)) {
      byId.set(key, fixture);
    }
  });

  return Array.from(byId.values());
}

/**
 * Filtra fixtures por día local (único criterio de pertenencia al día).
 * @param {Array} fixtures
 * @param {string} dateStringLocal YYYY-MM-DD
 */
export function filterFixturesByLocalDay(fixtures, dateStringLocal) {
  return dedupeFixtures(fixtures).filter((fixture) =>
    isFixtureInLocalDay(fixture, dateStringLocal)
  );
}
