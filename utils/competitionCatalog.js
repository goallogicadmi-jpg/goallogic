const fs = require("fs");
const path = require("path");

const CATALOG_PATH = path.join(__dirname, "../frontend/src/config/competitionCatalog.json");

/** Lee el catálogo en cada llamada para evitar datos obsoletos en memoria (require cache). */
function readCatalogFile() {
  const raw = fs.readFileSync(CATALOG_PATH, "utf8");
  return JSON.parse(raw);
}

function getCompetitionCatalog() {
  return [...readCatalogFile()].sort((left, right) => left.priority - right.priority);
}

function getCompetitionsByDomain(domain) {
  return getCompetitionCatalog().filter((competition) => competition.domain === domain);
}

function getCompetitionById(competitionId) {
  const parsedId = Number(competitionId);
  return readCatalogFile().find((competition) => Number(competition.id) === parsedId) || null;
}

function getCompetitionByIdAndDomain(competitionId, domain) {
  const competition = getCompetitionById(competitionId);
  if (!competition || competition.domain !== domain) {
    return null;
  }

  return competition;
}

function getCompetitionIdsByDomain(domain) {
  return getCompetitionsByDomain(domain).map((competition) => Number(competition.id));
}

module.exports = {
  getCompetitionCatalog,
  getCompetitionsByDomain,
  getCompetitionById,
  getCompetitionByIdAndDomain,
  getCompetitionIdsByDomain,
};
