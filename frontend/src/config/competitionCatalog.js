import competitionCatalog from "./competitionCatalog.json";

const domainRouteMap = {
  club: "clubes",
  selection: "selecciones",
};

/** API-Sports league/1.png es un escudo genérico oscuro; usamos un activo visible. */
const COMPETITION_LOGO_OVERRIDES = {
  1: "/competition-logos/world-cup.svg",
};

export function getCompetitionCatalog() {
  return [...competitionCatalog].sort((left, right) => left.priority - right.priority);
}

export function getCompetitionsByDomainFromCatalog(domain) {
  return getCompetitionCatalog().filter((competition) => competition.domain === domain);
}

export function getCompetitionByIdFromCatalog(competitionId) {
  const parsedId = Number(competitionId);
  return competitionCatalog.find((competition) => Number(competition.id) === parsedId) || null;
}

export function getDomainRouteSegment(domain) {
  return domainRouteMap[domain] || domainRouteMap.club;
}

export function getCompetitionRoute(domain, competitionId) {
  return `/${getDomainRouteSegment(domain)}/competicion/${competitionId}`;
}

export function getTeamRoute(domain, teamId) {
  return `/${getDomainRouteSegment(domain)}/equipo/${teamId}`;
}

export function getDomainLabel(domain) {
  return domain === "selection" ? "Selecciones" : "Clubes";
}

export function getDefaultCompetitionDomain(pathname = "/") {
  return pathname.startsWith("/selecciones") ? "selection" : "club";
}

/**
 * URL del escudo: catálogo > fuentes externas > convención API-Football.
 * @param {number|string} competitionId
 * @param {...*} sources - logo, league.logo, etc.
 * @returns {string|null}
 */
export function resolveCompetitionLogo(competitionId, ...sources) {
  const parsedId = Number(competitionId);
  const override =
    Number.isFinite(parsedId) && COMPETITION_LOGO_OVERRIDES[parsedId]
      ? COMPETITION_LOGO_OVERRIDES[parsedId]
      : null;
  const catalog = getCompetitionByIdFromCatalog(competitionId);
  const candidates = [...sources, override, catalog?.logo];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  if (Number.isFinite(parsedId) && parsedId > 0) {
    return `https://media.api-sports.io/football/leagues/${parsedId}.png`;
  }

  return null;
}

/**
 * Fuentes en orden de preferencia (CDN + copia local en /public).
 * @returns {string[]}
 */
export function getCompetitionLogoSources(competitionId, ...sources) {
  const parsedId = Number(competitionId);
  const override =
    Number.isFinite(parsedId) && COMPETITION_LOGO_OVERRIDES[parsedId]
      ? COMPETITION_LOGO_OVERRIDES[parsedId]
      : null;
  const remote = resolveCompetitionLogo(competitionId, ...sources);
  const local =
    Number.isFinite(parsedId) && parsedId > 0
      ? `/competition-logos/${parsedId}.png`
      : null;

  const ordered = [];
  if (override) ordered.push(override);
  if (remote && remote !== override) ordered.push(remote);
  if (local && !ordered.includes(local)) ordered.push(local);
  return ordered;
}

/**
 * Fusiona metadatos del catálogo (nombre, país, escudo) sobre datos de API u otras fuentes.
 */

export function applyCatalogDisplay(competitionLike) {
  const rawId = competitionLike?.id ?? competitionLike?.league?.id;
  const parsedId = Number(rawId);
  if (!Number.isFinite(parsedId)) {
    return competitionLike;
  }

  const catalog = getCompetitionByIdFromCatalog(parsedId);
  if (!catalog) {
    return competitionLike;
  }

  return {
    ...competitionLike,
    id: catalog.id,
    name: catalog.name,
    country: catalog.country,
    logo: resolveCompetitionLogo(parsedId, competitionLike?.logo, competitionLike?.league?.logo, catalog.logo),
    domain: catalog.domain,
    type: catalog.type,
    format: catalog.format,
    seasonMode: catalog.seasonMode,
    priority: catalog.priority,
    features: catalog.features,
  };
}
