const User = require('../models/User');
const AnalystSubscription = require('../models/AnalystSubscription');
const AnalystMessage = require('../models/AnalystMessage');
const AnalystPaymentRecord = require('../models/AnalystPaymentRecord');
const AnalystVerification = require('../models/AnalystVerification');
const CommunityPost = require('../models/CommunityPost');
const Bet = require('../models/Bet');
const { getAnalystBetStats } = require('./analystStats');
const { mapSubscriberPublicView } = require('./publicId');
const { notDeletedFilter } = require('./moderationHelpers');

const ACTIVE_SUB_STATUSES = ['active', 'trialing', 'past_due'];

function isActiveAnalyst(user) {
  return user?.role === 'analista' && user.analystStatus !== 'suspended';
}

async function getAnalystDashboard() {
  const analysts = await User.find({ role: 'analista' })
    .select('analystStatus analystVerifiedAt analystSubscriptionPriceCents')
    .lean();

  const activeAnalysts = analysts.filter(
    (a) => a.analystStatus !== 'suspended' && a.analystStatus !== 'rejected' && a.analystStatus !== 'pending'
  ).length;
  const suspendedAnalysts = analysts.filter((a) => a.analystStatus === 'suspended').length;

  const pendingVerifications = await AnalystVerification.countDocuments({ status: 'pending' });

  const totalSubscribers = await AnalystSubscription.countDocuments({
    status: { $in: ACTIVE_SUB_STATUSES },
  });

  const revenueAgg = await AnalystPaymentRecord.aggregate([
    { $match: { status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$amountCents' } } },
  ]);
  const totalRevenueCents = revenueAgg[0]?.total || 0;

  const enriched = await Promise.all(
    analysts.map(async (a) => {
      const stats = await getAnalystBetStats(a._id);
      const subscribers = await AnalystSubscription.countDocuments({
        analystId: a._id,
        status: { $in: ACTIVE_SUB_STATUSES },
      });
      return {
        id: a._id,
        roi: stats.roi,
        winRate: stats.winRate,
        currentStreak: stats.currentStreak,
        subscribers,
        nombre: (await User.findById(a._id).select('nombre').lean())?.nombre || '',
      };
    })
  );

  const topByRoi = [...enriched].sort((a, b) => b.roi - a.roi).slice(0, 5);
  const topByWinRate = [...enriched].sort((a, b) => b.winRate - a.winRate).slice(0, 5);
  const topByStreak = [...enriched].sort((a, b) => b.currentStreak - a.currentStreak).slice(0, 5);
  const topBySubscribers = [...enriched].sort((a, b) => b.subscribers - a.subscribers).slice(0, 5);

  return {
    activeAnalysts,
    pendingVerifications,
    suspendedAnalysts,
    totalSubscribers,
    totalRevenueCents,
    tops: {
      roi: topByRoi,
      winRate: topByWinRate,
      streak: topByStreak,
      subscribers: topBySubscribers,
    },
  };
}

async function mapAnalystAdminRow(user) {
  const stats = await getAnalystBetStats(user._id);
  const subscribers = await AnalystSubscription.countDocuments({
    analystId: user._id,
    status: { $in: ACTIVE_SUB_STATUSES },
  });

  const status = user.analystStatus === 'none' || !user.analystStatus ? 'active' : user.analystStatus;

  return {
    id: user._id,
    nombre: user.nombre,
    apellido: user.apellido || '',
    email: user.email,
    publicId: user.publicId || null,
    foto_perfil_url: user.foto_perfil_url || null,
    role: user.role,
    analystStatus: status,
    verified: Boolean(user.analystVerifiedAt),
    analystVerifiedAt: user.analystVerifiedAt,
    subscribers,
    analystStripePriceId: user.analystStripePriceId || '',
    analystSubscriptionPriceCents: user.analystSubscriptionPriceCents ?? null,
    analystPostsBlocked: user.analystPostsBlocked === true,
    analystMessagesBlocked: user.analystMessagesBlocked === true,
    analystSuspendedAt: user.analystSuspendedAt,
    analystSuspendedReason: user.analystSuspendedReason,
    warningsCount: user.analystWarnings?.length || 0,
    roi: stats.roi,
    winRate: stats.winRate,
    currentStreak: stats.currentStreak,
    pais: user.pais,
    analystDescription: user.analystDescription || '',
    created_at: user.created_at,
  };
}

async function getAnalystAdminDetail(analystId) {
  const user = await User.findById(analystId).lean();
  if (!user || user.role !== 'analista') return null;

  const base = await mapAnalystAdminRow(user);
  const stats = await getAnalystBetStats(analystId);
  const bets = await Bet.find({ user_id: String(analystId) }).sort({ created_at: -1 }).limit(100).lean();
  const posts = await CommunityPost.find({ user: analystId, ...notDeletedFilter() })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const subs = await AnalystSubscription.find({ analystId })
    .populate('subscriberId', 'nombre publicId')
    .sort({ createdAt: -1 })
    .lean();

  const subscribers = subs.map((s) => ({
    subscriptionId: s._id,
    status: s.status,
    startedAt: s.createdAt,
    currentPeriodEnd: s.currentPeriodEnd,
    canceledAt: s.status === 'canceled' ? s.updatedAt : null,
    subscriber: mapSubscriberPublicView(s.subscriberId),
  }));

  const messages = await AnalystMessage.find({ analystId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const payments = await AnalystPaymentRecord.find({ analystId })
    .sort({ paidAt: -1 })
    .limit(50)
    .lean();

  const revenueAgg = await AnalystPaymentRecord.aggregate([
    { $match: { analystId: user._id, status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$amountCents' } } },
  ]);

  return {
    ...base,
    stats,
    bets,
    performanceTimeline: stats.performanceTimeline,
    posts,
    subscribers,
    messages: messages.map((m) => ({
      id: m._id,
      title: m.title,
      content: m.content,
      createdAt: m.createdAt,
      suspended: m.suspended === true,
      suspendedAt: m.suspendedAt,
      suspendedReason: m.suspendedReason,
    })),
    payments,
    totalRevenueCents: revenueAgg[0]?.total || 0,
    warnings: user.analystWarnings || [],
  };
}

async function recordAnalystPayment({
  analystId,
  subscriberId,
  stripeInvoiceId,
  stripeSubscriptionId,
  amountCents,
  currency,
  paidAt,
}) {
  if (!analystId || !subscriberId || !amountCents) return null;
  if (stripeInvoiceId) {
    const exists = await AnalystPaymentRecord.findOne({ stripeInvoiceId }).lean();
    if (exists) return exists;
  }

  return AnalystPaymentRecord.create({
    analystId,
    subscriberId,
    stripeInvoiceId: stripeInvoiceId || null,
    stripeSubscriptionId: stripeSubscriptionId || null,
    amountCents,
    currency: currency || 'eur',
    status: 'paid',
    paidAt: paidAt || new Date(),
  });
}

module.exports = {
  ACTIVE_SUB_STATUSES,
  isActiveAnalyst,
  getAnalystDashboard,
  mapAnalystAdminRow,
  getAnalystAdminDetail,
  recordAnalystPayment,
};
