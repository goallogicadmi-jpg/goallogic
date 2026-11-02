/** Ligas/módulos premium (Champions, Mundial, Eliminatorias UEFA). */
import {
  getUserFeatures,
  isAdminUser,
  isFamilyAccount,
  isGrowthModeConsumer,
} from './planAccess';

export const PREMIUM_MODULE_LEAGUE_IDS = new Set([1, 2, 848, 849, 13, 11]);

export function isPremiumModuleLeague(leagueId) {
  const id = Number(leagueId);
  return PREMIUM_MODULE_LEAGUE_IDS.has(id);
}

export function canAccessPremiumModule(user, leagueId, { freeModeEnabled = false } = {}) {
  if (!user) return false;
  if (isAdminUser(user) || isFamilyAccount(user)) {
    return true;
  }
  if (isGrowthModeConsumer(user, freeModeEnabled)) return true;
  if (!isPremiumModuleLeague(leagueId)) return true;
  return getUserFeatures(user, { freeModeEnabled }).premiumModules === true;
}
