const AnalystSubscription = require('../models/AnalystSubscription');
const logger = require('./logger');

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

async function activateAnalystSubscription({
  subscriberId,
  analystId,
  stripeSubscriptionId,
  stripeCustomerId,
  status = 'active',
  currentPeriodEnd = null,
}) {
  if (!subscriberId || !analystId) return null;

  const set = {
    status: ACTIVE_STATUSES.has(status) ? status : 'active',
    stripeSubscriptionId: stripeSubscriptionId || null,
    stripeCustomerId: stripeCustomerId || null,
    currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
  };

  const row = await AnalystSubscription.findOneAndUpdate(
    { subscriberId, analystId },
    { $set: set },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  logger.info('analyst_subscription_activated', {
    subscriberId: String(subscriberId),
    analystId: String(analystId),
    subscriptionId: stripeSubscriptionId || null,
  });

  return row;
}

async function deactivateAnalystSubscriptionByStripeId(stripeSubscriptionId) {
  if (!stripeSubscriptionId) return null;

  const row = await AnalystSubscription.findOneAndUpdate(
    { stripeSubscriptionId },
    { $set: { status: 'canceled' } },
    { new: true }
  );

  if (row) {
    logger.info('analyst_subscription_canceled', {
      subscriberId: String(row.subscriberId),
      analystId: String(row.analystId),
      subscriptionId: stripeSubscriptionId,
    });
  }

  return row;
}

async function syncAnalystSubscriptionFromStripe(sub) {
  if (!sub?.metadata || sub.metadata.checkoutType !== 'analyst_subscription') {
    return null;
  }

  const subscriberId = sub.metadata.userId || sub.metadata.subscriberId;
  const analystId = sub.metadata.analystId;
  if (!subscriberId || !analystId) return null;

  if (ACTIVE_STATUSES.has(sub.status)) {
    return activateAnalystSubscription({
      subscriberId,
      analystId,
      stripeSubscriptionId: sub.id,
      stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : null,
      status: sub.status,
      currentPeriodEnd: sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null,
    });
  }

  return deactivateAnalystSubscriptionByStripeId(sub.id);
}

module.exports = {
  activateAnalystSubscription,
  deactivateAnalystSubscriptionByStripeId,
  syncAnalystSubscriptionFromStripe,
};
