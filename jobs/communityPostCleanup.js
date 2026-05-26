const mongoose = require('mongoose');
const CommunityPost = require('../models/CommunityPost');
const PostComment = require('../models/PostComment');
const PostReaction = require('../models/PostReaction');
const logger = require('../utils/logger');

const { getSettingNumber } = require('../utils/systemSettingsService');

function getPostTtlMs() {
  const hours = getSettingNumber('community.post_ttl_hours', 72);
  return Math.max(1, hours) * 60 * 60 * 1000;
}

/** Intervalo entre ejecuciones del limpiador (1 hora) */
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

const BATCH_SIZE = 100;

let cleanupTimer = null;
let isRunning = false;

/**
 * Elimina publicaciones y datos relacionados (comentarios, reacciones).
 * @param {import('mongoose').Types.ObjectId[]} postIds
 * @returns {Promise<number>} cantidad de publicaciones eliminadas
 */
async function deletePostsAndRelated(postIds) {
  if (!postIds.length) return 0;

  await PostComment.deleteMany({ post: { $in: postIds } });
  await PostReaction.deleteMany({ post: { $in: postIds } });
  const result = await CommunityPost.deleteMany({ _id: { $in: postIds } });
  return result.deletedCount || 0;
}

/**
 * Elimina publicaciones cuya fecha de creación supera las 72 horas.
 * @returns {Promise<number>}
 */
async function purgeExpiredCommunityPosts() {
  const cutoff = new Date(Date.now() - getPostTtlMs());
  let totalDeleted = 0;

  // Procesar en lotes para no bloquear el event loop ni saturar la BD
  for (;;) {
    const expired = await CommunityPost.find({ createdAt: { $lt: cutoff } })
      .select('_id')
      .limit(BATCH_SIZE)
      .lean();

    if (!expired.length) break;

    const ids = expired.map((p) => p._id);
    totalDeleted += await deletePostsAndRelated(ids);

    if (expired.length < BATCH_SIZE) break;
  }

  return totalDeleted;
}

async function runCleanup() {
  if (isRunning) return;
  if (mongoose.connection.readyState !== 1) return;

  isRunning = true;
  try {
    const deleted = await purgeExpiredCommunityPosts();
    if (deleted > 0) {
      logger.info('community_posts_expired_purged', { deleted, ttlHours: 72 });
    }
  } catch (err) {
    logger.error('community_posts_cleanup_failed', { message: err.message });
    console.error('Error en limpieza automática de Comunidad:', err);
  } finally {
    isRunning = false;
  }
}

/**
 * Inicia el proceso periódico de eliminación de publicaciones expiradas.
 * No bloquea el arranque del servidor ni otras rutas.
 */
function startCommunityPostCleanup() {
  if (cleanupTimer) return;

  // Primera pasada tras conectar (sin await en el hilo principal)
  setImmediate(() => {
    runCleanup();
  });

  cleanupTimer = setInterval(runCleanup, CLEANUP_INTERVAL_MS);
  if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }
}

function stopCommunityPostCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

module.exports = {
  CLEANUP_INTERVAL_MS,
  purgeExpiredCommunityPosts,
  startCommunityPostCleanup,
  stopCommunityPostCleanup,
};
