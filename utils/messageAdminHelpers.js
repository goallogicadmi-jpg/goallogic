const User = require('../models/User');
const Message = require('../models/Message');
const MessageCampaign = require('../models/MessageCampaign');
const MessageTemplate = require('../models/MessageTemplate');
const CommunityPost = require('../models/CommunityPost');
const Bet = require('../models/Bet');
const logger = require('./logger');
const { TRIAL_DAYS, FREE_DAILY_PREDICTIONS, FREE_DAILY_SIMULATIONS } = require('./planAccess');

const TEMPLATE_VARIABLES = ['name', 'email', 'premium_since', 'trialEndsAt', 'plan', 'trialDays'];
const DEFAULT_BATCH_SIZE = 50;
const BATCH_DELAY_MS = 80;

const DEFAULT_TEMPLATES = [
  {
    name: 'Bienvenida',
    titulo: 'Bienvenido/a a GoalLogic, {{name}}',
    contenido:
      'Hola {{name}},\n\nGracias por unirte a GoalLogic. Tu cuenta ({{email}}) ya está activa.\n\n¡Disfruta predicciones, comunidad y simulador!',
    description: 'Mensaje de bienvenida con nombre y email',
  },
  {
    name: 'Premium activo',
    titulo: 'Tu suscripción premium está activa',
    contenido:
      'Hola {{name}},\n\nTu membresía premium está activa desde {{premium_since}}.\n\nGracias por apoyar GoalLogic.',
    description: 'Usuarios premium — variable premium_since',
  },
  {
    name: 'Bienvenida extendida',
    titulo: 'Bienvenida extendida a GOAL_LOGIC, {{name}}',
    contenido:
      'Hola {{name}},\n\n¡Bienvenido/a a GOAL_LOGIC! Tu cuenta ({{email}}) ya está activa.\n\n' +
      '—— TU PRUEBA GRATUITA ——\n' +
      'Tienes acceso PRO completo durante {{trialDays}} días.\n' +
      'Tu trial finaliza el {{trialEndsAt}} (plan actual: {{plan}}).\n\n' +
      'Durante el trial puedes explorar sin límites:\n' +
      '• Predicciones ilimitadas\n' +
      '• Simulaciones ilimitadas\n' +
      '• Estadísticas avanzadas\n' +
      '• Torneos premium\n' +
      '• Modelos avanzados GOAL_LOGIC\n' +
      '• Alertas y notificaciones\n\n' +
      '—— PLAN FREE (después del trial) ——\n' +
      'Podrás seguir usando GOAL_LOGIC con acceso a la app completa, pero con estas condiciones:\n\n' +
      'Incluye:\n' +
      `• Navegación completa de la app\n` +
      `• ${FREE_DAILY_PREDICTIONS} predicciones por día\n` +
      `• ${FREE_DAILY_SIMULATIONS} simulación por día\n` +
      '• Estadísticas y panorama básico\n' +
      '• Tabla, partidos, goleadores y equipos\n\n' +
      'Funciones premium bloqueadas (verás el modal de upgrade):\n' +
      '• Estadísticas avanzadas\n' +
      '• Torneos premium (Champions, Mundial, etc.)\n' +
      '• Modelos avanzados GOAL_LOGIC\n' +
      '• Alertas y notificaciones\n\n' +
      '—— PLAN PRO ——\n' +
      'Acceso total sin límites:\n' +
      '• Predicciones y simulaciones ilimitadas\n' +
      '• Todas las funciones premium desbloqueadas\n' +
      '• Soporte al proyecto GOAL_LOGIC\n\n' +
      'Explora la app y aprovecha tu trial. Cuando expire, podrás continuar gratis o mejorar a PRO desde Mi Proyecto.\n\n' +
      '— Equipo GOAL_LOGIC',
    description: 'Guía detallada enviada automáticamente en el primer login',
  },
];

function logMessageAction(action, req, payload = {}) {
  logger.info('admin_message_action', {
    action,
    actorId: req?.user?.id ? String(req.user.id) : null,
    ip: req?.ip || null,
    ...payload,
  });
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSegment(raw = {}) {
  const premium = ['all', 'premium', 'free'].includes(raw.premium) ? raw.premium : 'all';
  const activity = ['all', 'active', 'inactive'].includes(raw.activity) ? raw.activity : 'all';
  const inactiveDays = Math.min(365, Math.max(1, parseInt(raw.inactiveDays, 10) || 30));
  const pais = raw.pais && String(raw.pais).trim() ? String(raw.pais).trim() : null;
  const userIds = Array.isArray(raw.userIds)
    ? raw.userIds.filter(Boolean).map(String)
    : [];
  return { premium, activity, inactiveDays, pais, userIds };
}

function formatPlanLabel(plan) {
  switch (plan) {
    case 'pro':
      return 'PRO';
    case 'trial':
      return 'Prueba gratuita';
    case 'free-family':
      return 'Familia';
    default:
      return 'Free';
  }
}

function applyTemplateVariables(text, user) {
  if (!text) return '';
  const premiumSince = user?.premium_since
    ? new Date(user.premium_since).toLocaleDateString('es-ES')
    : '—';
  const trialEndsAt = user?.trialEndsAt
    ? new Date(user.trialEndsAt).toLocaleDateString('es-ES')
    : '—';
  const plan = formatPlanLabel(user?.plan);
  return String(text)
    .replace(/\{\{name\}\}/gi, user?.nombre || '')
    .replace(/\{\{email\}\}/gi, user?.email || '')
    .replace(/\{\{premium_since\}\}/gi, premiumSince)
    .replace(/\{\{trialEndsAt\}\}/gi, trialEndsAt)
    .replace(/\{\{plan\}\}/gi, plan)
    .replace(/\{\{trialDays\}\}/gi, String(TRIAL_DAYS));
}

async function seedDefaultTemplatesIfEmpty() {
  const count = await MessageTemplate.countDocuments();
  if (count > 0) return 0;
  await MessageTemplate.insertMany(
    DEFAULT_TEMPLATES.map((t) => ({
      ...t,
      variables: TEMPLATE_VARIABLES,
    }))
  );
  return DEFAULT_TEMPLATES.length;
}

async function ensureDefaultTemplates() {
  await seedDefaultTemplatesIfEmpty();

  const legacyGuide = await MessageTemplate.findOne({ name: 'Guía GOAL_LOGIC' }).lean();
  const extendedGuide = await MessageTemplate.findOne({ name: 'Bienvenida extendida' }).lean();
  if (legacyGuide && !extendedGuide) {
    await MessageTemplate.updateOne(
      { _id: legacyGuide._id },
      { $set: { name: 'Bienvenida extendida' } }
    );
  }

  let inserted = 0;
  for (const tpl of DEFAULT_TEMPLATES) {
    const exists = await MessageTemplate.findOne({ name: tpl.name }).lean();
    if (!exists) {
      await MessageTemplate.create({
        ...tpl,
        variables: TEMPLATE_VARIABLES,
      });
      inserted += 1;
    }
  }
  return inserted;
}

async function buildBaseUserQuery(segment) {
  const query = { role: 'usuario' };
  if (segment.premium === 'premium') query.premium = true;
  if (segment.premium === 'free') query.premium = false;
  if (segment.pais) {
    query.pais = new RegExp(`^${escapeRegex(segment.pais)}$`, 'i');
  }
  return query;
}

async function resolveSegmentUserIds(segment) {
  const seg = normalizeSegment(segment);

  if (seg.userIds.length > 0) {
    const users = await User.find({ _id: { $in: seg.userIds }, role: 'usuario' })
      .select('_id')
      .lean();
    return users.map((u) => u._id);
  }

  const users = await User.find(await buildBaseUserQuery(seg))
    .select('_id nombre email premium_since updated_at created_at')
    .lean();

  if (seg.activity === 'all') {
    return users.map((u) => u._id);
  }

  const cutoff = new Date(Date.now() - seg.inactiveDays * 24 * 60 * 60 * 1000);
  const userIds = users.map((u) => u._id);
  if (!userIds.length) return [];

  const [postActivity, betActivity] = await Promise.all([
    CommunityPost.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: '$user', lastAt: { $max: '$createdAt' } } },
    ]),
    Bet.aggregate([
      { $match: { user_id: { $in: userIds.map((id) => String(id)) } } },
      { $group: { _id: '$user_id', lastAt: { $max: '$created_at' } } },
    ]),
  ]);

  const lastMap = new Map();
  users.forEach((u) => {
    const base = u.updated_at || u.created_at;
    lastMap.set(String(u._id), new Date(base));
  });
  postActivity.forEach((p) => {
    const id = String(p._id);
    const prev = lastMap.get(id);
    const d = new Date(p.lastAt);
    if (!prev || d > prev) lastMap.set(id, d);
  });
  betActivity.forEach((b) => {
    const id = String(b._id);
    const prev = lastMap.get(id);
    const d = new Date(b.lastAt);
    if (!prev || d > prev) lastMap.set(id, d);
  });

  const result = [];
  for (const u of users) {
    const last = lastMap.get(String(u._id)) || new Date(0);
    const isActive = last >= cutoff;
    if (seg.activity === 'active' && isActive) result.push(u._id);
    if (seg.activity === 'inactive' && !isActive) result.push(u._id);
  }
  return result;
}

async function countSegmentUsers(segment) {
  const ids = await resolveSegmentUserIds(segment);
  return ids.length;
}

async function previewMessageContent({ titulo, contenido, userId }) {
  let user = null;
  if (userId) {
    user = await User.findById(userId).select('nombre email premium_since trialEndsAt plan').lean();
  }
  if (!user) {
    user = await User.findOne({ role: 'usuario' })
      .select('nombre email premium_since trialEndsAt plan')
      .lean();
  }
  if (!user) {
    user = {
      nombre: 'Usuario',
      email: 'usuario@ejemplo.com',
      premium_since: null,
      trialEndsAt: null,
      plan: 'free',
    };
  }
  return {
    titulo: applyTemplateVariables(titulo, user),
    contenido: applyTemplateVariables(contenido, user),
    sampleUser: { id: user._id, nombre: user.nombre, email: user.email },
  };
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function refreshCampaignStats(campaignId) {
  const [delivered, opened] = await Promise.all([
    Message.countDocuments({ campaign_id: campaignId }),
    Message.countDocuments({ campaign_id: campaignId, leido: true }),
  ]);
  await MessageCampaign.findByIdAndUpdate(campaignId, {
    $set: {
      'stats.delivered': delivered,
      'stats.opened': opened,
    },
  });
  return { delivered, opened };
}

async function executeCampaign(campaignId) {
  const campaign = await MessageCampaign.findById(campaignId);
  if (!campaign) throw new Error('Campaña no encontrada');

  if (['sent', 'cancelled'].includes(campaign.status)) {
    return campaign;
  }

  campaign.status = 'processing';
  campaign.startedAt = new Date();
  await campaign.save();

  const userIds = await resolveSegmentUserIds(campaign.segment);
  campaign.stats.targetCount = userIds.length;
  await campaign.save();

  if (userIds.length === 0) {
    campaign.status = 'failed';
    campaign.completedAt = new Date();
    campaign.errorLog.push({ message: 'Sin destinatarios para el segmento' });
    await campaign.save();
    return campaign;
  }

  const users = await User.find({ _id: { $in: userIds } })
    .select('nombre email premium_since trialEndsAt plan')
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const batchSize = campaign.batchSize || DEFAULT_BATCH_SIZE;
  let delivered = 0;
  let errors = 0;

  for (let i = 0; i < userIds.length; i += batchSize) {
    const chunk = userIds.slice(i, i + batchSize);
    const docs = [];

    for (const uid of chunk) {
      const user = userMap.get(String(uid));
      if (!user) {
        errors += 1;
        campaign.errorLog.push({ userId: uid, message: 'Usuario no encontrado' });
        continue;
      }
      try {
        docs.push({
          user_id: uid,
          admin_id: campaign.adminId,
          titulo: applyTemplateVariables(campaign.titulo, user).slice(0, 200),
          contenido: applyTemplateVariables(campaign.contenido, user).slice(0, 5000),
          leido: false,
          campaign_id: campaign._id,
        });
      } catch (err) {
        errors += 1;
        campaign.errorLog.push({ userId: uid, message: err.message });
      }
    }

    if (docs.length) {
      try {
        await Message.insertMany(docs, { ordered: false });
        delivered += docs.length;
      } catch (err) {
        errors += chunk.length;
        campaign.errorLog.push({ message: err.message || 'Error en lote' });
      }
    }

    campaign.stats.delivered = delivered;
    campaign.stats.errorCount = errors;
    await campaign.save();

    if (i + batchSize < userIds.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  await refreshCampaignStats(campaign._id);

  const final = await MessageCampaign.findById(campaign._id);
  final.stats.errorCount = errors;
  final.completedAt = new Date();
  if (errors > 0 && delivered > 0) final.status = 'partial';
  else if (errors > 0 && delivered === 0) final.status = 'failed';
  else final.status = 'sent';
  await final.save();

  return final;
}

async function processDueScheduledCampaigns() {
  const now = new Date();
  const due = await MessageCampaign.find({
    status: 'scheduled',
    scheduledAt: { $lte: now },
  })
    .sort({ scheduledAt: 1 })
    .limit(5)
    .lean();

  let processed = 0;
  for (const row of due) {
    try {
      await executeCampaign(row._id);
      processed += 1;
    } catch (err) {
      logger.error('message_campaign_worker_error', {
        campaignId: String(row._id),
        message: err.message,
      });
      await MessageCampaign.findByIdAndUpdate(row._id, {
        status: 'failed',
        completedAt: new Date(),
        $push: { errorLog: { message: err.message } },
      });
    }
  }
  return processed;
}

function mapCampaignListItem(row) {
  const stats = row.stats || {};
  const openRate =
    stats.delivered > 0 ? Math.round((stats.opened / stats.delivered) * 100) : 0;
  return {
    id: row._id,
    titulo: row.titulo,
    status: row.status,
    sendMode: row.sendMode,
    scheduledAt: row.scheduledAt,
    segment: row.segment,
    stats: {
      targetCount: stats.targetCount || 0,
      delivered: stats.delivered || 0,
      opened: stats.opened || 0,
      errors: stats.errorCount || 0,
      openRate,
    },
    templateId: row.templateId,
    note: row.note,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapTemplate(row) {
  return {
    id: row._id,
    name: row.name,
    titulo: row.titulo,
    contenido: row.contenido,
    description: row.description,
    variables: row.variables || TEMPLATE_VARIABLES,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseDateQuery(value, endOfDay = false) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
}

module.exports = {
  TEMPLATE_VARIABLES,
  DEFAULT_BATCH_SIZE,
  logMessageAction,
  normalizeSegment,
  applyTemplateVariables,
  seedDefaultTemplatesIfEmpty,
  ensureDefaultTemplates,
  resolveSegmentUserIds,
  countSegmentUsers,
  previewMessageContent,
  executeCampaign,
  processDueScheduledCampaigns,
  refreshCampaignStats,
  mapCampaignListItem,
  mapTemplate,
  parseDateQuery,
};
