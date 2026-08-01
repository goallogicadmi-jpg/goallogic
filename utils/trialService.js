const User = require('../models/User');
const UserDailyUsage = require('../models/UserDailyUsage');
const logger = require('./logger');
const {
  buildExpiredTrialUpdate,
  getUtcDateKey,
  hasFullProAccess,
  isTrialCurrentlyActive,
  getPlanLimits,
  resolveEffectivePlan,
} = require('./planAccess');
const { isBillingLocked } = require('./familyUser');

/**
 * Expira trial si corresponde. Retorna usuario actualizado (lean).
 */
async function expireTrialIfNeeded(user) {
  if (!user?._id) return user;
  if (isBillingLocked(user) || (user.premium === true && user.plan === 'pro')) {
    return user;
  }
  if (user.trialActive !== true || !user.trialEndsAt) return user;
  if (isTrialCurrentlyActive(user)) return user;

  await User.updateOne(
    { _id: user._id },
    { $set: { ...buildExpiredTrialUpdate(), updated_at: new Date() } }
  );

  logger.info('trial_expired_user', { userId: String(user._id), email: user.email });

  return User.findById(user._id).lean();
}

async function expireAllDueTrials() {
  const now = new Date();
  const result = await User.updateMany(
    {
      trialActive: true,
      trialEndsAt: { $lte: now },
      billingLocked: { $ne: true },
      tipo: { $ne: 'familia' },
      plan: { $ne: 'pro' },
    },
    { $set: { ...buildExpiredTrialUpdate(), updated_at: now } }
  );

  if (result.modifiedCount > 0) {
    logger.info('trial_expiration_batch', { modifiedCount: result.modifiedCount });
  }

  return result.modifiedCount || 0;
}

async function getOrCreateDailyUsage(userId, dateKey = getUtcDateKey()) {
  let row = await UserDailyUsage.findOne({ user_id: userId, date: dateKey }).lean();
  if (!row) {
    row = (
      await UserDailyUsage.findOneAndUpdate(
        { user_id: userId, date: dateKey },
        { $setOnInsert: { predictions: 0, simulations: 0 } },
        { upsert: true, new: true }
      )
    ).toObject();
  }
  return row;
}

async function checkAndIncrementUsage(user, type) {
  if (hasFullProAccess(user)) {
    return { allowed: true, unlimited: true };
  }

  const effectivePlan = resolveEffectivePlan(user);
  const planLimits = getPlanLimits(effectivePlan) || {
    predictionsPerDay: 0,
    simulationsPerDay: 0,
  };
  const limit =
    type === 'predictions' ? planLimits.predictionsPerDay : planLimits.simulationsPerDay;
  const dateKey = getUtcDateKey();
  const usage = await getOrCreateDailyUsage(user._id, dateKey);
  const current = usage[type] || 0;

  if (current >= limit) {
    return {
      allowed: false,
      unlimited: false,
      limit,
      used: current,
      remaining: 0,
      message:
        type === 'predictions'
          ? `Has alcanzado el límite de ${limit} predicciones diarias del plan gratuito.`
          : `Has alcanzado el límite de ${limit} simulación diaria del plan gratuito.`,
    };
  }

  const updated = await UserDailyUsage.findOneAndUpdate(
    { user_id: user._id, date: dateKey },
    { $inc: { [type]: 1 } },
    { upsert: true, new: true }
  ).lean();

  const used = updated[type] || 0;
  return {
    allowed: true,
    unlimited: false,
    limit,
    used,
    remaining: Math.max(0, limit - used),
  };
}

async function getDailyUsageSummary(userId, user = null) {
  const dateKey = getUtcDateKey();
  const usage = await getOrCreateDailyUsage(userId, dateKey);
  const effectivePlan = user ? resolveEffectivePlan(user) : 'free';
  const planLimits = getPlanLimits(effectivePlan) || {
    predictionsPerDay: 0,
    simulationsPerDay: 0,
  };

  return {
    date: dateKey,
    predictions: {
      used: usage.predictions || 0,
      limit: planLimits.predictionsPerDay,
      remaining: Math.max(0, planLimits.predictionsPerDay - (usage.predictions || 0)),
    },
    simulations: {
      used: usage.simulations || 0,
      limit: planLimits.simulationsPerDay,
      remaining: Math.max(0, planLimits.simulationsPerDay - (usage.simulations || 0)),
    },
  };
}

module.exports = {
  expireTrialIfNeeded,
  expireAllDueTrials,
  getOrCreateDailyUsage,
  checkAndIncrementUsage,
  getDailyUsageSummary,
};
