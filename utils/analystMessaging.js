const AnalystSubscription = require('../models/AnalystSubscription');
const AnalystMessage = require('../models/AnalystMessage');
const Message = require('../models/Message');
const User = require('../models/User');
const { ensureUserPublicId, mapSubscriberPublicView } = require('./publicId');

const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

async function listAnalystSubscribersPublic(analystId) {
  const rows = await AnalystSubscription.find({
    analystId,
    status: { $in: ACTIVE_STATUSES },
  })
    .populate('subscriberId', 'nombre publicId')
    .sort({ createdAt: -1 })
    .lean();

  const subscribers = [];
  for (const row of rows) {
    const user = row.subscriberId;
    if (!user?._id) continue;
    if (!user.publicId) {
      await ensureUserPublicId(user._id);
      const refreshed = await User.findById(user._id).select('nombre publicId').lean();
      subscribers.push(mapSubscriberPublicView(refreshed));
    } else {
      subscribers.push(mapSubscriberPublicView(user));
    }
  }

  return subscribers;
}

async function resolveTargetSubscribers(analystId, subscriberIds, subscriberPublicIds) {
  const subs = await AnalystSubscription.find({
    analystId,
    status: { $in: ACTIVE_STATUSES },
  })
    .populate('subscriberId', 'publicId')
    .lean();

  const allowedById = new Map(
    subs
      .filter((s) => s.subscriberId?._id)
      .map((s) => [String(s.subscriberId._id), s.subscriberId.publicId || null])
  );

  if ((!subscriberIds || subscriberIds.length === 0) && (!subscriberPublicIds || subscriberPublicIds.length === 0)) {
    return [...allowedById.keys()];
  }

  if (subscriberPublicIds?.length) {
    const allowedPublicIds = new Set(
      [...allowedById.values()].filter(Boolean).map(String)
    );
    const invalid = subscriberPublicIds.filter((pid) => !allowedPublicIds.has(String(pid)));
    if (invalid.length) {
      const err = new Error('Solo puedes enviar mensajes a tus propios suscriptores.');
      err.code = 'invalid_subscribers';
      err.status = 403;
      throw err;
    }

    return [...allowedById.entries()]
      .filter(([, publicId]) => subscriberPublicIds.includes(String(publicId)))
      .map(([id]) => id);
  }

  const invalid = subscriberIds.filter((id) => !allowedById.has(String(id)));
  if (invalid.length) {
    const err = new Error('Solo puedes enviar mensajes a tus propios suscriptores.');
    err.code = 'invalid_subscribers';
    err.status = 403;
    throw err;
  }

  return subscriberIds.map(String);
}

async function sendAnalystMessages(analystId, { title, content, subscriberIds, subscriberPublicIds }) {
  const trimmedTitle = (title || '').trim();
  const trimmedContent = (content || '').trim();

  if (!trimmedTitle || !trimmedContent) {
    const err = new Error('El título y el contenido son obligatorios.');
    err.code = 'validation_error';
    err.status = 400;
    throw err;
  }

  const targets = await resolveTargetSubscribers(
    analystId,
    subscriberIds,
    subscriberPublicIds
  );

  if (!targets.length) {
    const err = new Error('No tienes suscriptores activos para enviar el mensaje.');
    err.code = 'no_subscribers';
    err.status = 400;
    throw err;
  }

  const sent = [];

  for (const subscriberId of targets) {
    const analystMessage = await AnalystMessage.create({
      analystId,
      subscriberId,
      title: trimmedTitle.slice(0, 200),
      content: trimmedContent.slice(0, 5000),
    });

    const inboxMessage = await Message.create({
      user_id: subscriberId,
      admin_id: analystId,
      titulo: trimmedTitle.slice(0, 200),
      contenido: trimmedContent.slice(0, 5000),
      leido: false,
      campaign_id: null,
    });

    sent.push({
      analystMessageId: analystMessage._id,
      inboxMessageId: inboxMessage._id,
      subscriberId,
    });
  }

  return { sentCount: sent.length, sent };
}

module.exports = {
  ACTIVE_STATUSES,
  listAnalystSubscribersPublic,
  sendAnalystMessages,
};
