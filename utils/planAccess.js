const TRIAL_DAYS = 5;
const FREE_DAILY_PREDICTIONS = 3;
const FREE_DAILY_SIMULATIONS = 1;

const PLANS = {
  TRIAL: 'trial',
  FREE: 'free',
  PRO: 'pro',
  FAMILY: 'free-family',
};

const FEATURES = {
  ADVANCED_STATS: 'advancedStats',
  PREMIUM_MODULES: 'premiumModules',
  ADVANCED_MODELS: 'advancedModels',
  ALERTS_NOTIFICATIONS: 'alertsNotifications',
};

const { isFamilyUser, isBillingLocked } = require('./familyUser');

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getUtcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function isAdminUser(user) {
  return (
    user?.role === 'admin' ||
    user?.role === 'admin_secundario' ||
    user?.isMainAdmin === true
  );
}

function isTrialCurrentlyActive(user) {
  if (!user || user.trialActive !== true) return false;
  if (!user.trialEndsAt) return false;
  return new Date(user.trialEndsAt).getTime() > Date.now();
}

function hasPaidPremium(user) {
  return user?.premium === true && user?.plan === PLANS.PRO;
}

function hasFullProAccess(user) {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  if (isFamilyUser(user) || isBillingLocked(user)) return true;
  if (hasPaidPremium(user)) return true;
  return isTrialCurrentlyActive(user);
}

function resolveEffectivePlan(user) {
  if (!user) return PLANS.FREE;
  if (isFamilyUser(user)) return PLANS.FAMILY;
  if (hasPaidPremium(user)) return PLANS.PRO;
  if (isTrialCurrentlyActive(user)) return PLANS.TRIAL;
  if (user.plan === PLANS.FREE || user.trialEndsAt) return PLANS.FREE;
  if (user.premium === true) return PLANS.PRO;
  return PLANS.FREE;
}

function getPlanLimits(effectivePlan) {
  if (effectivePlan === PLANS.FREE) {
    return {
      predictionsPerDay: FREE_DAILY_PREDICTIONS,
      simulationsPerDay: FREE_DAILY_SIMULATIONS,
    };
  }
  return null;
}

function resolveFeatureTier(user) {
  if (!user) return PLANS.FREE;
  if (isAdminUser(user) || isFamilyUser(user) || isBillingLocked(user)) {
    return PLANS.PRO;
  }
  if (isTrialCurrentlyActive(user)) return PLANS.TRIAL;
  const effectivePlan = resolveEffectivePlan(user);
  if (effectivePlan === PLANS.FAMILY) return PLANS.PRO;
  return effectivePlan;
}

function canAccessFeature(user, feature) {
  const tier = resolveFeatureTier(user);

  switch (feature) {
    case FEATURES.ADVANCED_STATS:
    case FEATURES.PREMIUM_MODULES:
    case FEATURES.ADVANCED_MODELS:
    case FEATURES.ALERTS_NOTIFICATIONS:
      return tier === PLANS.TRIAL || tier === PLANS.PRO;
    default:
      return true;
  }
}

function buildFeatureAccess(user) {
  return {
    advancedStats: canAccessFeature(user, FEATURES.ADVANCED_STATS),
    premiumModules: canAccessFeature(user, FEATURES.PREMIUM_MODULES),
    advancedModels: canAccessFeature(user, FEATURES.ADVANCED_MODELS),
    alertsNotifications: canAccessFeature(user, FEATURES.ALERTS_NOTIFICATIONS),
  };
}

function getTrialDaysRemaining(user) {
  if (!isTrialCurrentlyActive(user) || !user.trialEndsAt) return 0;
  const ms = new Date(user.trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function buildTrialFieldsForNewUser(now = new Date()) {
  return {
    trialActive: true,
    trialEndsAt: addDays(now, TRIAL_DAYS),
    plan: PLANS.TRIAL,
    premium: false,
    welcomeShown: false,
    trialExpiredAcknowledged: false,
  };
}

function buildExpiredTrialUpdate() {
  return {
    trialActive: false,
    plan: PLANS.FREE,
    premium: false,
  };
}

function shouldShowTrialExpiredModal(user) {
  if (!user || isFamilyUser(user) || hasPaidPremium(user)) return false;
  if (user.trialExpiredAcknowledged === true) return false;
  if (!user.trialEndsAt) return false;
  return !isTrialCurrentlyActive(user);
}

/** Usado solo para metadata de checkout; PRO es el único plan de pago. */
function resolvePlanFromStripePriceId() {
  return PLANS.PRO;
}

function serializePlanStatus(user) {
  const effectivePlan = resolveEffectivePlan(user);
  const trialActive = isTrialCurrentlyActive(user);
  const limits = hasFullProAccess(user) ? null : getPlanLimits(effectivePlan);

  return {
    plan: effectivePlan,
    trialActive,
    trialEndsAt: user?.trialEndsAt || null,
    trialDaysRemaining: getTrialDaysRemaining(user),
    hasProAccess: hasFullProAccess(user),
    welcomeShown: user?.welcomeShown === true,
    trialExpiredAcknowledged: user?.trialExpiredAcknowledged === true,
    showTrialExpiredModal: shouldShowTrialExpiredModal(user),
    limits,
    features: buildFeatureAccess(user),
  };
}

module.exports = {
  TRIAL_DAYS,
  FREE_DAILY_PREDICTIONS,
  FREE_DAILY_SIMULATIONS,
  PLANS,
  FEATURES,
  addDays,
  getUtcDateKey,
  isTrialCurrentlyActive,
  hasFullProAccess,
  hasPaidPremium,
  resolveEffectivePlan,
  getPlanLimits,
  canAccessFeature,
  buildFeatureAccess,
  getTrialDaysRemaining,
  buildTrialFieldsForNewUser,
  buildExpiredTrialUpdate,
  shouldShowTrialExpiredModal,
  resolvePlanFromStripePriceId,
  serializePlanStatus,
};
