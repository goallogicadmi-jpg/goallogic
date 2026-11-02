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

export function isNormalConsumer(user) {
  if (!user) return false;
  const role = user?.role || 'usuario';
  return role === 'usuario';
}

export function isGrowthModeConsumer(user, freeModeEnabled = false) {
  return freeModeEnabled === true && isNormalConsumer(user);
}

export function hasFullProAccess(user, { freeModeEnabled = false } = {}) {
  if (!user) return false;
  if (isAdminUser(user) || isFamilyAccount(user)) return true;
  if (isGrowthModeConsumer(user, freeModeEnabled)) return true;
  if (user.growthModeConsumer === true) return true;
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

const ALL_FEATURES = {
  advancedStats: true,
  premiumModules: true,
  advancedModels: true,
  alertsNotifications: true,
};

export function getUserFeatures(user, { freeModeEnabled = false } = {}) {
  if (!user) return DEFAULT_FEATURES;
  if (isGrowthModeConsumer(user, freeModeEnabled)) return ALL_FEATURES;
  if (user.features && typeof user.features === 'object') {
    const merged = { ...DEFAULT_FEATURES, ...user.features };
    if (hasFullProAccess(user, { freeModeEnabled })) {
      return { ...merged, ...ALL_FEATURES };
    }
    return merged;
  }
  if (hasFullProAccess(user, { freeModeEnabled })) {
    return ALL_FEATURES;
  }
  return DEFAULT_FEATURES;
}

export function canAccessFeature(user, feature, { freeModeEnabled = false } = {}) {
  return getUserFeatures(user, { freeModeEnabled })[feature] === true;
}

/** Ocultar upsell PRO para consumidores en Modo Gratuito (admin/analistas no aplican). */
export function shouldSuppressPlatformUpsell(user, freeModeEnabled = false) {
  return isGrowthModeConsumer(user, freeModeEnabled);
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
