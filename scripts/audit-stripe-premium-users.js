/**
 * Auditoría post-pago Stripe → MongoDB.
 * Uso: node scripts/audit-stripe-premium-users.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const HOURS = 48;

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('Falta MONGO_URI');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const since = new Date(Date.now() - HOURS * 60 * 60 * 1000);

  const recentPremium = await User.find({
    premium: true,
    updated_at: { $gte: since },
  })
    .select('email premium premium_since stripe_customer_id stripe_subscription_id created_at updated_at role')
    .sort({ updated_at: -1 })
    .lean();

  const recentAny = await User.find({ updated_at: { $gte: since } })
    .select('email premium stripe_customer_id stripe_subscription_id updated_at created_at')
    .sort({ updated_at: -1 })
    .limit(15)
    .lean();

  const withStripe = await User.find({
    $or: [
      { stripe_customer_id: { $exists: true, $ne: null, $ne: '' } },
      { stripe_subscription_id: { $exists: true, $ne: null, $ne: '' } },
    ],
  })
    .select('email premium stripe_customer_id stripe_subscription_id updated_at')
    .sort({ updated_at: -1 })
    .limit(20)
    .lean();

  const dupEmails = await User.aggregate([
    { $group: { _id: { $toLower: '$email' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  const dupCustomers = await User.aggregate([
    { $match: { stripe_customer_id: { $exists: true, $nin: [null, ''] } } },
    { $group: { _id: '$stripe_customer_id', count: { $sum: 1 }, emails: { $push: '$email' } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  const premiumNoStripe = await User.countDocuments({
    premium: true,
    $or: [
      { stripe_customer_id: { $exists: false } },
      { stripe_customer_id: null },
      { stripe_customer_id: '' },
    ],
    role: { $nin: ['admin', 'admin_secundario'] },
    isMainAdmin: { $ne: true },
  });

  console.log('=== Usuarios premium actualizados (últimas', HOURS, 'h):', recentPremium.length, '===');
  for (const u of recentPremium) {
    console.log({
      id: String(u._id),
      email: u.email,
      premium: u.premium,
      premium_since: u.premium_since,
      stripe_customer_id: u.stripe_customer_id || '(vacío)',
      stripe_subscription_id: u.stripe_subscription_id || '(vacío)',
      updated_at: u.updated_at,
      created_at: u.created_at,
    });
  }

  console.log('\n=== Usuarios con IDs Stripe (recientes):', withStripe.length, '===');
  for (const u of withStripe.slice(0, 10)) {
    console.log({
      email: u.email,
      premium: u.premium,
      stripe_customer_id: u.stripe_customer_id,
      stripe_subscription_id: u.stripe_subscription_id || '(vacío)',
      updated_at: u.updated_at,
    });
  }

  console.log('\n=== Últimos usuarios tocados (cualquier estado):', recentAny.length, '===');
  for (const u of recentAny) {
    console.log({
      email: u.email,
      premium: u.premium,
      stripe_customer_id: u.stripe_customer_id || '(vacío)',
      updated_at: u.updated_at,
    });
  }

  console.log('\n=== Duplicados email:', dupEmails.length, '===');
  if (dupEmails.length) console.log(dupEmails);

  console.log('\n=== Duplicados stripe_customer_id:', dupCustomers.length, '===');
  if (dupCustomers.length) console.log(dupCustomers);

  console.log('\n=== Premium sin stripe_customer_id (no admin):', premiumNoStripe, '===');

  const issues = [];
  for (const u of recentPremium) {
    if (!u.stripe_customer_id) issues.push(`Premium reciente sin customer: ${u.email}`);
    if (!u.premium_since) issues.push(`Premium sin premium_since: ${u.email}`);
  }
  if (dupEmails.length) issues.push('Emails duplicados en colección users');
  if (dupCustomers.length) issues.push('stripe_customer_id compartido entre usuarios');

  console.log('\n=== Resumen ===');
  if (issues.length === 0 && recentPremium.length > 0) {
    console.log('OK: usuarios premium recientes con datos Stripe coherentes.');
  } else if (recentPremium.length === 0) {
    console.log('AVISO: no hay usuarios premium actualizados en las últimas', HOURS, 'h.');
  } else {
    console.log('Problemas detectados:');
    issues.forEach((i) => console.log(' -', i));
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
