import axios from "axios";
import {
  getCompetitionByIdFromCatalog,
  getCompetitionsByDomainFromCatalog,
} from "../config/competitionCatalog";

/**
 * Ligas del módulo Predicciones desde el catálogo local (respaldo si falla la API).
 */
export function getPredictionsLeaguesFromCatalog(domain = "club") {
  return getCompetitionsByDomainFromCatalog(domain)
    .filter((comp) => comp.features?.hasPredictions !== false)
    .map((comp) => ({
      id: Number(comp.id),
      nombre: comp.name,
      pais: comp.country,
      logo: comp.logo,
      domain: comp.domain,
      priority: comp.priority ?? 9999,
      seasonMode: comp.seasonMode || "european_split",
    }))
    .filter((liga) => liga.id && liga.nombre)
    .sort((a, b) => (a.priority ?? 9999) - (b.priority ?? 9999));
}

export function getLeagueSeasonMode(leagueId) {
  const comp = getCompetitionByIdFromCatalog(leagueId);
  return comp?.seasonMode || "european_split";
}

export async function fetchPredictionsLeagues(domain = "club") {
  const url =
    domain === "selection" ? "/api/predicciones/ligas?domain=selection" : "/api/predicciones/ligas";

  try {
    const { data } = await axios.get(url);
    if (data?.success && Array.isArray(data.ligas) && data.ligas.length > 0) {
      return data.ligas
        .filter((l) => l?.id != null && l.domain === domain)
        .map((l) => ({ ...l, id: Number(l.id) }));
    }
  } catch {
    // fallback below
  }

  return getPredictionsLeaguesFromCatalog(domain);
}
