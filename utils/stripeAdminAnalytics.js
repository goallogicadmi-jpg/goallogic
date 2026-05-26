const Stripe = require('stripe');
const User = require('../models/User');

const MONTHS_CHART = 6;

function monthKey(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function lastNMonthKeys(n) {
  const keys = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(monthKey(d));
  }
  return keys;
}

function startOfMonthUtc(year, monthIndex) {
  return Math.floor(new Date(Date.UTC(year, monthIndex, 1)).getTime() / 1000);
}

function startOfCurrentMonthUtc() {
  const now = new Date();
  return startOfMonthUtc(now.getUTCFullYear(), now.getUTCMonth());
}

function formatMoney(cents, currency = 'usd') {
  const amount = (cents || 0) / 100;
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

async function fetchAllStripeList(listFn, maxItems = 200) {
  const items = [];
  let starting_after;
  while (items.length < maxItems) {
    const page = await listFn(starting_after);
    items.push(...(page.data || []));
    if (!page.has_more || !page.data?.length) break;
    starting_after = page.data[page.data.length - 1].id;
  }
  return items.slice(0, maxItems);
}

async function buildCharts(stripe, monthKeys) {
  const revenueByMonth = Object.fromEntries(monthKeys.map((k) => [k, 0]));
  const newSubsByMonth = Object.fromEntries(monthKeys.map((k) => [k, 0]));
  const cancelByMonth = Object.fromEntries(monthKeys.map((k) => [k, 0]));

  const oldestMonth = monthKeys[0];
  const [y, m] = oldestMonth.split('-').map(Number);
  const createdGte = startOfMonthUtc(y, m - 1);

  const invoices = await fetchAllStripeList(
    (starting_after) =>
      stripe.invoices.list({
        limit: 100,
        status: 'paid',
        created: { gte: createdGte },
        starting_after,
      }),
    150
  );

  invoices.forEach((inv) => {
    const paid = inv.status_transitions?.paid_at || inv.created;
    const key = monthKey(new Date(paid * 1000));
    if (revenueByMonth[key] !== undefined) {
      revenueByMonth[key] += inv.amount_paid || 0;
    }
  });

  const subscriptions = await fetchAllStripeList(
    (starting_after) =>
      stripe.subscriptions.list({
        limit: 100,
        status: 'all',
        created: { gte: createdGte },
        starting_after,
      }),
    200
  );

  subscriptions.forEach((sub) => {
    const createdKey = monthKey(new Date(sub.created * 1000));
    if (newSubsByMonth[createdKey] !== undefined) {
      newSubsByMonth[createdKey] += 1;
    }
    const canceledAt = sub.canceled_at;
    if (canceledAt) {
      const cancelKey = monthKey(new Date(canceledAt * 1000));
      if (cancelByMonth[cancelKey] !== undefined) {
        cancelByMonth[cancelKey] += 1;
      }
    }
  });

  return {
    months: monthKeys,
    revenueByMonth: monthKeys.map((k) => revenueByMonth[k]),
    newSubscriptionsByMonth: monthKeys.map((k) => newSubsByMonth[k]),
    cancellationsByMonth: monthKeys.map((k) => cancelByMonth[k]),
  };
}

async function getMonthSummary(stripe, monthStartUnix) {
  const nowUnix = Math.floor(Date.now() / 1000);

  const [invoices, newSubs, canceledSubs] = await Promise.all([
    fetchAllStripeList(
      (starting_after) =>
        stripe.invoices.list({
          limit: 100,
          status: 'paid',
          created: { gte: monthStartUnix, lte: nowUnix },
          starting_after,
        }),
      100
    ),
    fetchAllStripeList(
      (starting_after) =>
        stripe.subscriptions.list({
          limit: 100,
          status: 'all',
          created: { gte: monthStartUnix, lte: nowUnix },
          starting_after,
        }),
      100
    ),
    fetchAllStripeList(
      (starting_after) =>
        stripe.subscriptions.list({
          limit: 100,
          status: 'canceled',
          starting_after,
        }),
      80
    ),
  ]);

  const revenueCents = invoices.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
  const newSubscriptions = newSubs.length;
  const cancellations = canceledSubs.filter(
    (s) => s.canceled_at && s.canceled_at >= monthStartUnix
  ).length;

  return { revenueCents, newSubscriptions, cancellations, currency: 'usd' };
}

async function getRecentPayments(stripe) {
  const sessions = await stripe.checkout.sessions.list({
    limit: 15,
    status: 'complete',
  });

  return (sessions.data || []).map((s) => ({
    id: s.id,
    type: 'checkout.session',
    amountTotal: s.amount_total,
    currency: s.currency,
    customerEmail: s.customer_details?.email || s.customer_email || null,
    paymentStatus: s.payment_status,
    mode: s.mode,
    created: new Date(s.created * 1000).toISOString(),
    subscriptionId: typeof s.subscription === 'string' ? s.subscription : null,
  }));
}

async function getActiveSubscriptions(stripe) {
  const subs = await stripe.subscriptions.list({
    limit: 15,
    status: 'active',
  });

  return (subs.data || []).map((s) => ({
    id: s.id,
    customerId: typeof s.customer === 'string' ? s.customer : s.customer?.id,
    status: s.status,
    created: new Date(s.created * 1000).toISOString(),
    currentPeriodEnd: s.current_period_end
      ? new Date(s.current_period_end * 1000).toISOString()
      : null,
    amount: s.items?.data?.[0]?.price?.unit_amount,
    currency: s.items?.data?.[0]?.price?.currency || 'usd',
    interval: s.items?.data?.[0]?.price?.recurring?.interval,
  }));
}

async function getRecentStripeEvents(stripe) {
  const events = await stripe.events.list({ limit: 20 });
  return (events.data || []).map((e) => ({
    id: e.id,
    type: e.type,
    created: new Date(e.created * 1000).toISOString(),
    livemode: e.livemode,
  }));
}

async function getStripeAnalytics() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error('STRIPE_SECRET_KEY no configurada');
  }

  const stripe = new Stripe(secret);
  const monthKeys = lastNMonthKeys(MONTHS_CHART);
  const monthStart = startOfCurrentMonthUtc();

  const [summary, charts, recentPayments, activeSubscriptions, stripeEvents, premiumActive] =
    await Promise.all([
      getMonthSummary(stripe, monthStart),
      buildCharts(stripe, monthKeys),
      getRecentPayments(stripe),
      getActiveSubscriptions(stripe),
      getRecentStripeEvents(stripe),
      User.countDocuments({ premium: true }),
    ]);

  return {
    summary: {
      revenueMonthCents: summary.revenueCents,
      revenueMonthFormatted: formatMoney(summary.revenueCents, summary.currency),
      newSubscriptionsMonth: summary.newSubscriptions,
      cancellationsMonth: summary.cancellations,
      premiumActiveCount: premiumActive,
      currency: summary.currency,
      monthLabel: monthKeys[monthKeys.length - 1],
    },
    charts,
    recentPayments,
    activeSubscriptions,
    stripeEvents,
    livemode: secret.startsWith('sk_live_'),
  };
}

module.exports = {
  getStripeAnalytics,
  formatMoney,
};
