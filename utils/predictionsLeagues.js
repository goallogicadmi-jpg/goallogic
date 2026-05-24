const { getCompetitionsByDomain } = require("./competitionCatalog");

/**
 * Ligas disponibles en el módulo de Predicciones (catálogo como fuente de verdad).
 */
function buildPredictionsLeagues(domain = "club", apiRows = []) {
  const isSelection = domain === "selection";
  const catalogComps = getCompetitionsByDomain(isSelection ? "selection" : "club");

  const apiByLeagueId = new Map();
  for (const item of apiRows || []) {
    const lid = Number(item?.league?.id);
    if (Number.isFinite(lid)) {
      apiByLeagueId.set(lid, item);
    }
  }

  return catalogComps
    .filter((comp) => comp.features?.hasPredictions !== false)
    .map((comp) => {
      const id = Number(comp.id);
      const apiItem = apiByLeagueId.get(id);
      return {
        id,
        nombre: comp.name || apiItem?.league?.name || "Liga desconocida",
        pais: comp.country || apiItem?.country?.name || "País desconocido",
        logo: comp.logo || apiItem?.league?.logo || null,
        domain: isSelection ? "selection" : "club",
        priority: comp.priority ?? 9999,
        seasonMode: comp.seasonMode || "european_split",
      };
    })
    .filter((liga) => liga.id && liga.nombre && liga.nombre !== "Liga desconocida")
    .sort((a, b) => (a.priority ?? 9999) - (b.priority ?? 9999));
}

module.exports = {
  buildPredictionsLeagues,
};
