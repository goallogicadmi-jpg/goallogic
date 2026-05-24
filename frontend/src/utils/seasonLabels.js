function extractYearFromDate(dateValue) {
  if (!dateValue) return null;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getUTCFullYear();
}

export function getSeasonCycleLabel(season, seasonMode = "calendar_year") {
  if (!season) {
    return "";
  }

  const startYear = extractYearFromDate(season.start);
  const endYear = extractYearFromDate(season.end);

  if (startYear && endYear) {
    if (startYear === endYear) {
      return `${startYear}`;
    }

    return `${startYear}-${endYear}`;
  }

  const baseYear = Number(season.year);
  if (Number.isNaN(baseYear)) {
    return String(season.year || "");
  }

  if (seasonMode === "european_split") {
    return `${baseYear}-${baseYear + 1}`;
  }

  return `${baseYear}`;
}

export function getSeasonOptionLabel(season, seasonMode = "calendar_year") {
  const cycleLabel = getSeasonCycleLabel(season, seasonMode);
  if (!cycleLabel) {
    return season?.current ? "(Actual)" : "";
  }

  return season?.current ? `${cycleLabel} (Actual)` : cycleLabel;
}

/**
 * Temporada por defecto al abrir una competición.
 * 1) La que la API marca como current (oficial).
 * 2) Si no hay flag, la de mayor año (última edición listada: p. ej. Mundial 2026 vs 2022).
 *
 * La lógica anterior filtraba solo temporadas con start <= hoy; las ediciones futuras
 * (sin start o start futuro) quedaban fuera y se acababa eligiendo seasons[0] (a menudo antigua).
 */
export function getPreferredSeason(seasons = []) {
  if (!Array.isArray(seasons) || seasons.length === 0) {
    return null;
  }

  const markedCurrent = seasons.find((season) => season?.current === true);
  if (markedCurrent) {
    return markedCurrent;
  }

  const withYear = seasons.filter((s) => s != null && !Number.isNaN(Number(s.year)));
  if (withYear.length === 0) {
    return seasons[0];
  }

  return [...withYear].sort((a, b) => Number(b.year) - Number(a.year))[0];
}
