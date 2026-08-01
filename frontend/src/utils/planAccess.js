export const PLANS = {
  TRIAL: 'trial',
  FREE: 'free',
  PRO: 'pro',
  FAMILY: 'free-family',
};

export const FEATURES = {
  ADVANCED_STATS: 'advancedStats',
  PREMIUM_MODULES: 'premiumModules',
  ADVANCED_MODELS: 'advancedModels',
  ALERTS_NOTIFICATIONS: 'alertsNotifications',
};

const DEFAULT_FEATURES = {
  advancedStats: false,
  premiumModules: false,
  advancedModels: false,
  alertsNotifications: false,
};

export function isAdminUser(user) {
  return (
    user?.role === 'admin' ||
    user?.role === 'admin_secundario' ||
    user?.isMainAdmin === true
  );
}

export function isFamilyAccount(user) {
  return (
    user?.billingLocked === true ||
    user?.tipo === 'familia' ||
    user?.plan === PLANS.FAMILY
  );
}

export function hasFullProAccess(user) {
  if (!user) return false;
  if (isAdminUser(user) || isFamilyAccount(user)) return true;
  if (user.hasProAccess === true) return true;
  if (user.trialActive === true) return true;
  if (user.premium === true && user.plan === PLANS.PRO) return true;
  return false;
}

export function resolveEffectivePlan(user) {
  if (!user) return PLANS.FREE;
  if (isFamilyAccount(user)) return PLANS.FAMILY;
  if (user.plan === PLANS.PRO || (user.premium === true && user.plan === PLANS.PRO)) {
    return PLANS.PRO;
  }
  if (user.trialActive || user.plan === PLANS.TRIAL) return PLANS.TRIAL;
  if (user.plan === PLANS.FREE) return PLANS.FREE;
  if (user.premium === true) return PLANS.PRO;
  return PLANS.FREE;
}

export function getUserFeatures(user) {
  if (!user) return DEFAULT_FEATURES;
  if (user.features && typeof user.features === 'object') {
    return { ...DEFAULT_FEATURES, ...user.features };
  }
  if (hasFullProAccess(user)) {
    return {
      advancedStats: true,
      premiumModules: true,
      advancedModels: true,
      alertsNotifications: true,
    };
  }
  return DEFAULT_FEATURES;
}

export function canAccessFeature(user, feature) {
  return getUserFeatures(user)[feature] === true;
}

export function getPlanLabel(plan) {
  switch (plan) {
    case PLANS.TRIAL:
      return 'Prueba gratuita';
    case PLANS.PRO:
      return 'PRO';
    case PLANS.FAMILY:
      return 'Familia';
    default:
      return 'Free';
  }
}
