const User = require('../models/User');
const AnalystSubscription = require('../models/AnalystSubscription');
const AnalystPaymentRecord = require('../models/AnalystPaymentRecord');
const CommunityPost = require('../models/CommunityPost');
const { getAnalystBetStats } = require('./analystStats');

const ACTIVE_SUB_STATUSES = ['active', 'trialing', 'past_due'];

const RANKING_CATEGORIES = {
  roi: { field: 'roi', label: 'Top ROI' },
  winRate: { field: 'winRate', label: 'Top % acierto' },
  streak: { field: 'currentStreak', label: 'Top racha' },
  subscribers: { field: 'subscribers', label: 'Top suscriptores' },
  revenue: { field: 'revenueCents', label: 'Top ingresos' },
  monthly: { field: 'monthlyRevenueCents', label: 'Top mensual' },
};

function getMonthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function resolveGoalLogicAuthorId() {
  const admin =
    (await User.findOne({ isMainAdmin: true }).select('_id').lean()) ||
    (await User.findOne({ role: 'admin' }).select('_id').lean());
  return admin?._id || null;
}

async function buildAnalystRankingRows() {
  const analysts = await User.find({
    role: 'analista',
    analystStatus: { $nin: ['suspended', 'rejected', 'pending'] },
  })
    .select('nombre publicId foto_perfil_url analystVerifiedAt')
    .lean();

  if (!analysts.length) return [];

  const analystIds = analysts.map((a) => a._id);
  const monthStart = getMonthStart();

  const [subscriberCounts, revenueTotals, monthlyTotals] = await Promise.all([
    AnalystSubscription.aggregate([
      {
        $match: {
          analystId: { $in: analystIds },
          status: { $in: ACTIVE_SUB_STATUSES },
        },
      },
      { $group: { _id: '$analystId', count: { $sum: 1 } } },
    ]),
    AnalystPaymentRecord.aggregate([
      { $match: { analystId: { $in: analystIds }, status: 'paid' } },
      { $group: { _id: '$analystId', total: { $sum: '$amountCents' } } },
    ]),
    AnalystPaymentRecord.aggregate([
      {
        $match: {
          analystId: { $in: analystIds },
          status: 'paid',
          paidAt: { $gte: monthStart },
        },
      },
      { $group: { _id: '$analystId', total: { $sum: '$amountCents' } } },
    ]),
  ]);

  const subsMap = new Map(subscriberCounts.map((r) => [String(r._id), r.count]));
  const revMap = new Map(revenueTotals.map((r) => [String(r._id), r.total]));
  const monthlyMap = new Map(monthlyTotals.map((r) => [String(r._id), r.total]));

  const rows = await Promise.all(
    analysts.map(async (analyst) => {
      const stats = await getAnalystBetStats(analyst._id);
      const id = String(analyst._id);
      return {
        id: analyst._id,
        nombre: analyst.nombre,
        publicId: analyst.publicId || null,
        foto_perfil_url: analyst.foto_perfil_url || null,
        verified: Boolean(analyst.analystVerifiedAt),
        roi: stats.roi ?? 0,
        winRate: stats.winRate ?? 0,
        currentStreak: stats.currentStreak ?? 0,
        subscribers: subsMap.get(id) || 0,
        revenueCents: revMap.get(id) || 0,
        monthlyRevenueCents: monthlyMap.get(id) || 0,
      };
    })
  );

  return rows;
}

function sortRankingRows(rows, category = 'roi') {
  const meta = RANKING_CATEGORIES[category] || RANKING_CATEGORIES.roi;
  const field = meta.field;
  return [...rows]
    .sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0))
    .map((row, index) => ({ ...row, position: index + 1 }));
}

async function getAnalystRanking(category = 'roi') {
  const rows = await buildAnalystRankingRows();
  const ranked = sortRankingRows(rows, category);

  const tops = {};
  for (const key of Object.keys(RANKING_CATEGORIES)) {
    tops[key] = sortRankingRows(rows, key).slice(0, 10);
  }

  return {
    category,
    categoryLabel: RANKING_CATEGORIES[category]?.label || RANKING_CATEGORIES.roi.label,
    rankings: ranked,
    tops,
    totalAnalysts: rows.length,
  };
}

function formatRankingLine(row) {
  const verified = row.verified ? ' ✓' : '';
  return `${row.position}. ${row.nombre}${verified} — ROI ${row.roi}% · Acierto ${row.winRate}% · Racha ${row.currentStreak} · Suscriptores ${row.subscribers}`;
}

function buildCommunityRankingPostText(topRows, categoryLabel) {
  const dateStr = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const lines = topRows.map(formatRankingLine);

  return [
    '🏆 RANKING OFICIAL GOAL_LOGIC',
    `Top 10 Analistas Deportivos — ${categoryLabel}`,
    `Actualizado: ${dateStr}`,
    '',
    ...lines,
    '',
    '— Publicado por GOAL_LOGIC · Analistas Deportivos Certificados',
  ].join('\n');
}

async function previewCommunityRankingPost(category = 'roi', limit = 10) {
  const rows = await buildAnalystRankingRows();
  const ranked = sortRankingRows(rows, category).slice(0, limit);
  const categoryLabel = RANKING_CATEGORIES[category]?.label || RANKING_CATEGORIES.roi.label;

  return {
    category,
    categoryLabel,
    topCount: ranked.length,
    text: buildCommunityRankingPostText(ranked, categoryLabel),
    analysts: ranked,
  };
}

async function publishCommunityRankingPost({ category = 'roi', actorId, limit = 10 }) {
  const preview = await previewCommunityRankingPost(category, limit);
  if (!preview.analysts.length) {
    const err = new Error('No hay analistas activos para publicar el ranking.');
    err.status = 400;
    throw err;
  }

  const authorId = (await resolveGoalLogicAuthorId()) || actorId;
  if (!authorId) {
    const err = new Error('No se encontró cuenta oficial GOAL_LOGIC para publicar.');
    err.status = 500;
    throw err;
  }

  const post = await CommunityPost.create({
    user: authorId,
    publicationType: 'Ranking Analistas',
    matchId: '',
    matchInfo: {},
    text: preview.text,
    statsUsed: [],
    probability: '',
  });

  return {
    postId: post._id,
    preview,
  };
}

module.exports = {
  RANKING_CATEGORIES,
  getAnalystRanking,
  previewCommunityRankingPost,
  publishCommunityRankingPost,
  buildAnalystRankingRows,
  sortRankingRows,
};
