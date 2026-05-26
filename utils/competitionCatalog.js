/**
 * Catálogo de competiciones — delega en leagueCatalogStore (Mongo + caché en memoria).
 * Fallback a JSON si Mongo no está disponible.
 */
const store = require('./leagueCatalogStore');

function getCompetitionCatalog() {
  return store.getCompetitionCatalog();
}

function getCompetitionsByDomain(domain) {
  return store.getCompetitionsByDomain(domain, { activeOnly: true });
}

function getCompetitionById(competitionId) {
  const c = store.getCompetitionById(competitionId);
  if (!c || c.active === false) return null;
  return c;
}

function getCompetitionByIdAndDomain(competitionId, domain) {
  return store.getCompetitionByIdAndDomain(competitionId, domain);
}

function getCompetitionIdsByDomain(domain) {
  return store.getCompetitionIdsByDomain(domain, { activeOnly: true });
}

module.exports = {
  getCompetitionCatalog,
  getCompetitionsByDomain,
  getCompetitionById,
  getCompetitionByIdAndDomain,
  getCompetitionIdsByDomain,
  initLeagueCatalogCache: store.initLeagueCatalogCache,
  reloadMemoryCatalog: store.reloadMemoryCatalog,
};
