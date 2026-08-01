import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTrialFieldsForNewUser,
  getTrialDaysRemaining,
  hasFullProAccess,
  isTrialCurrentlyActive,
  resolveEffectivePlan,
  serializePlanStatus,
  getPlanLimits,
  buildFeatureAccess,
  canAccessFeature,
  FEATURES,
  PLANS,
} from '../utils/planAccess.js';

test('buildTrialFieldsForNewUser sets 5-day trial', () => {
  const now = new Date('2026-06-01T12:00:00Z');
  const fields = buildTrialFieldsForNewUser(now);
  assert.equal(fields.trialActive, true);
  assert.equal(fields.plan, PLANS.TRIAL);
  assert.equal(fields.premium, false);
  const ends = new Date(fields.trialEndsAt);
  assert.equal(ends.toISOString().slice(0, 10), '2026-06-06');
});

test('hasFullProAccess during active trial', () => {
  const user = {
    trialActive: true,
    trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    premium: false,
    plan: PLANS.TRIAL,
  };
  assert.equal(isTrialCurrentlyActive(user), true);
  assert.equal(hasFullProAccess(user), true);
  assert.equal(resolveEffectivePlan(user), PLANS.TRIAL);
});

test('expired trial resolves to free plan', () => {
  const user = {
    trialActive: true,
    trialEndsAt: new Date(Date.now() - 1000),
    premium: false,
    plan: PLANS.TRIAL,
  };
  assert.equal(isTrialCurrentlyActive(user), false);
  assert.equal(hasFullProAccess(user), false);
  assert.equal(resolveEffectivePlan(user), PLANS.FREE);
});

test('serializePlanStatus includes days remaining', () => {
  const user = {
    trialActive: true,
    trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    plan: PLANS.TRIAL,
    welcomeShown: false,
    trialExpiredAcknowledged: false,
  };
  const status = serializePlanStatus(user);
  assert.equal(status.trialActive, true);
  assert.equal(status.trialDaysRemaining, 3);
  assert.equal(status.hasProAccess, true);
});

test('getTrialDaysRemaining returns 0 when inactive', () => {
  assert.equal(getTrialDaysRemaining({ trialActive: false }), 0);
});

test('free plan has limits and blocked premium features', () => {
  const freeUser = { premium: false, plan: PLANS.FREE, trialActive: false };
  assert.equal(hasFullProAccess(freeUser), false);
  assert.deepEqual(getPlanLimits(PLANS.FREE), {
    predictionsPerDay: 3,
    simulationsPerDay: 1,
  });
  assert.equal(canAccessFeature(freeUser, FEATURES.PREMIUM_MODULES), false);
  assert.equal(canAccessFeature(freeUser, FEATURES.ADVANCED_MODELS), false);
  assert.equal(buildFeatureAccess(freeUser).premiumModules, false);
});

test('pro plan has full feature access', () => {
  const proUser = { premium: true, plan: PLANS.PRO, trialActive: false };
  assert.equal(hasFullProAccess(proUser), true);
  assert.equal(getPlanLimits(PLANS.PRO), null);
  assert.equal(canAccessFeature(proUser, FEATURES.ADVANCED_STATS), true);
  assert.equal(canAccessFeature(proUser, FEATURES.ALERTS_NOTIFICATIONS), true);
});
