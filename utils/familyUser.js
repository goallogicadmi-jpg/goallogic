const FAMILY_PLAN = 'free-family';
const FAMILY_TIPO = 'familia';

function isFamilyUser(user) {
  if (!user) return false;
  return user.tipo === FAMILY_TIPO || user.plan === FAMILY_PLAN;
}

function isBillingLocked(user) {
  return user?.billingLocked === true || isFamilyUser(user);
}

function buildFamilyUserFields(overrides = {}) {
  return {
    tipo: FAMILY_TIPO,
    plan: FAMILY_PLAN,
    premium: true,
    billingLocked: true,
    welcomeShown: false,
    premium_since: overrides.premium_since || new Date(),
    ...overrides,
  };
}

module.exports = {
  FAMILY_PLAN,
  FAMILY_TIPO,
  isFamilyUser,
  isBillingLocked,
  buildFamilyUserFields,
};
