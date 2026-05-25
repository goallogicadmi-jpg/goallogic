/**
 * Verifica configuración Stripe y creación de sesión Checkout (sin JWT).
 * Uso: node scripts/verify-stripe-checkout.js
 */
require('dotenv').config();
const Stripe = require('stripe');

const sk = (process.env.STRIPE_SECRET_KEY || '').trim();
const priceId = (process.env.STRIPE_PRICE_ID || '').trim();
const successUrl = process.env.STRIPE_SUCCESS_URL;
const cancelUrl = process.env.STRIPE_CANCEL_URL;

function keyMode(secret) {
  if (secret.startsWith('sk_live_')) return 'live';
  if (secret.startsWith('sk_test_')) return 'test';
  return 'unknown';
}

async function main() {
  console.log('STRIPE_SECRET_KEY mode:', keyMode(sk));
  console.log('STRIPE_PRICE_ID:', priceId || '(vacío)');
  console.log('STRIPE_SUCCESS_URL:', successUrl ? 'ok' : 'MISSING');
  console.log('STRIPE_CANCEL_URL:', cancelUrl ? 'ok' : 'MISSING');

  if (!sk) {
    console.error('Falta STRIPE_SECRET_KEY');
    process.exit(1);
  }
  if (!priceId) {
    console.error('Falta STRIPE_PRICE_ID');
    process.exit(1);
  }

  const stripe = new Stripe(sk);
  const price = await stripe.prices.retrieve(priceId);
  console.log('Price livemode:', price.livemode, '| recurring:', Boolean(price.recurring));

  const testPrice = 'price_1TWlIEE606ur5xpfmaICDFWm';
  try {
    await stripe.prices.retrieve(testPrice);
    console.log('Test price (old) aún visible en esta cuenta');
  } catch (e) {
    console.log('Test price (old) no existe con esta clave (esperado en LIVE):', e.code);
  }

  const session = await stripe.checkout.sessions.create({
    mode: price.recurring ? 'subscription' : 'payment',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${successUrl || 'https://goallogic.vercel.app/pago-exitoso'}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || 'https://goallogic.vercel.app/pago-cancelado',
    client_reference_id: 'verify-script',
    metadata: { userId: 'verify-script' },
    ...(price.recurring
      ? { subscription_data: { metadata: { userId: 'verify-script' } } }
      : {}),
  });

  console.log('Checkout session OK:', session.url?.slice(0, 70) + '...');
}

main().catch((e) => {
  console.error('FALLO:', e.type, e.code, e.message);
  process.exit(1);
});
