import { resolveOfficialSelectionKnockoutFormat, hasOfficialKnockoutFormat as hasSelectionKnockout } from './selectionKnockoutFormats.js';
import {
  resolveOfficialClubKnockoutFormat,
  hasOfficialClubKnockoutFormat,
  getLinkedCompetitionIdsForKnockout,
} from './clubKnockoutFormats.js';

export const ROUND_LABELS = {
  playoff: 'Playoff (Repechaje)',
  roundOf32: 'Ronda de 32',
  roundOf16: 'Octavos de Final',
  quarterFinals: 'Cuartos de Final',
  semiFinals: 'Semifinales',
  thirdPlace: 'Tercer Puesto',
  final: 'Final',
};

export function resolveOfficialKnockoutFormat(competitionId, groupCount = 0) {
  const id = Number(competitionId);
  const clubFormat = resolveOfficialClubKnockoutFormat(id);
  if (clubFormat) {
    return clubFormat;
  }
  return resolveOfficialSelectionKnockoutFormat(id, groupCount);
}

export function hasOfficialKnockoutFormat(competitionId) {
  const id = Number(competitionId);
  return hasOfficialClubKnockoutFormat(id) || hasSelectionKnockout(id);
}

export { getLinkedCompetitionIdsForKnockout, hasOfficialClubKnockoutFormat };
