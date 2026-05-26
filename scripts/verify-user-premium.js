/**
 * Verificación puntual de un usuario post-pago Stripe.
 * Uso: node scripts/verify-user-premium.js [userId|email]
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const TARGET_ID = '6a14c905fef6cc67ca6a121c';
const TARGET_EMAIL = 'muggle677h@outlook.com';
const EXPECTED = {
  premium: true,
  stripe_customer_id: 'cus_UaHrb0BbZhMCVb',
  stripe_subscription_id: 'sub_1Tb7HPE8KSBWzWIRdVILDTX5',
};

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const user = await User.findById(TARGET_ID).lean();
  if (!user) {
    console.error('Usuario no encontrado:', TARGET_ID);
    process.exit(1);
  }

  const checks = [
    ['email', user.email === TARGET_EMAIL, user.email, TARGET_EMAIL],
    ['premium', user.premium === EXPECTED.premium, user.premium, EXPECTED.premium],
    ['premium_since', Boolean(user.premium_since), user.premium_since, 'set'],
    [
      'stripe_customer_id',
      user.stripe_customer_id === EXPECTED.stripe_customer_id,
      user.stripe_customer_id,
      EXPECTED.stripe_customer_id,
    ],
    [
      'stripe_subscription_id',
      user.stripe_subscription_id === EXPECTED.stripe_subscription_id,
      user.stripe_subscription_id,
      EXPECTED.stripe_subscription_id,
    ],
  ];

  console.log('=== Usuario MongoDB ===');
  console.log(JSON.stringify({
    _id: String(user._id),
    email: user.email,
    premium: user.premium,
    premium_since: user.premium_since,
    stripe_customer_id: user.stripe_customer_id,
    stripe_subscription_id: user.stripe_subscription_id,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
  }, null, 2));

  console.log('\n=== Checks ===');
  let ok = true;
  for (const [name, pass, got, exp] of checks) {
    console.log(pass ? 'OK' : 'FAIL', name, '| got:', got, '| expected:', exp);
    if (!pass) ok = false;
  }

  if (process.env.STRIPE_SECRET_KEY) {
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sub = await stripe.subscriptions.retrieve(EXPECTED.stripe_subscription_id);
    const metaOk = sub.metadata?.userId === TARGET_ID;
    const emailOk = (await stripe.customers.retrieve(EXPECTED.stripe_customer_id)).email === TARGET_EMAIL;
    const stripeOk = sub.status === 'active' && sub.livemode === true && metaOk && emailOk;
    console.log('\n=== Stripe LIVE ===');
    console.log('subscription status:', sub.status, '| livemode:', sub.livemode);
    console.log('metadata.userId:', sub.metadata?.userId, metaOk ? 'OK' : 'FAIL');
    console.log('customer email match:', emailOk ? 'OK' : 'FAIL');
    if (!stripeOk) ok = false;
  }

  await mongoose.disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
