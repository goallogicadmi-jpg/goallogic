import { getCompetitionByIdFromCatalog } from '../config/competitionCatalog';

/**
 * Dominio canónico de una competición (catálogo > hint de ruta).
 */
export function resolveCompetitionDomain(competitionId, domainHint) {
  const fromCatalog = getCompetitionByIdFromCatalog(competitionId)?.domain;
  if (fromCatalog === 'club' || fromCatalog === 'selection') {
    return fromCatalog;
  }
  if (domainHint === 'club' || domainHint === 'selection') {
    return domainHint;
  }
  return 'club';
}

export function isSelectionCompetition(competitionId, domainHint) {
  return resolveCompetitionDomain(competitionId, domainHint) === 'selection';
}

export function isClubCompetition(competitionId, domainHint) {
  return resolveCompetitionDomain(competitionId, domainHint) === 'club';
}

export function assertCompetitionMatchesDomain(competitionId, domainHint) {
  const catalog = getCompetitionByIdFromCatalog(competitionId);
  if (!catalog || !domainHint) {
    return { ok: true, catalog, domain: resolveCompetitionDomain(competitionId, domainHint) };
  }
  if (catalog.domain !== domainHint) {
    return {
      ok: false,
      catalog,
      domain: catalog.domain,
      message: 'Esta competición no pertenece al dominio actual',
    };
  }
  return { ok: true, catalog, domain: catalog.domain };
}
