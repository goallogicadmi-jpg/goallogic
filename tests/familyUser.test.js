import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFamilyUserFields,
  isBillingLocked,
  isFamilyUser,
  FAMILY_PLAN,
  FAMILY_TIPO,
} from '../utils/familyUser.js';

test('buildFamilyUserFields sets free-family plan and billing lock', () => {
  const fields = buildFamilyUserFields();
  assert.equal(fields.tipo, FAMILY_TIPO);
  assert.equal(fields.plan, FAMILY_PLAN);
  assert.equal(fields.premium, true);
  assert.equal(fields.billingLocked, true);
  assert.equal(fields.welcomeShown, false);
});

test('isFamilyUser detects familia tipo and free-family plan', () => {
  assert.equal(isFamilyUser({ tipo: 'familia' }), true);
  assert.equal(isFamilyUser({ plan: 'free-family' }), true);
  assert.equal(isFamilyUser({ tipo: 'usuario', plan: null }), false);
});

test('isBillingLocked is true for family accounts', () => {
  assert.equal(isBillingLocked({ billingLocked: true }), true);
  assert.equal(isBillingLocked({ tipo: 'familia' }), true);
  assert.equal(isBillingLocked({ tipo: 'usuario' }), false);
});
