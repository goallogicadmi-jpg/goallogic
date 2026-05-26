const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const checkAdmin = require('../middleware/checkAdmin');
const CommunityPost = require('../models/CommunityPost');
const PostComment = require('../models/PostComment');
const PostReaction = require('../models/PostReaction');
const User = require('../models/User');
const {
  logModerationAction,
  notDeletedFilter,
} = require('../utils/moderationHelpers');
const logger = require('../utils/logger');

const router = express.Router();

function parseDateQuery(value, endOfDay = false) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
}

function pushModerationHistory(doc, action, actorId, note = '') {
  if (!doc.moderationHistory) doc.moderationHistory = [];
  doc.moderationHistory.push({
    action,
    actor: actorId,
    note: String(note || '').slice(0, 500),
    at: new Date(),
  });
  if (doc.moderationHistory.length > 30) {
    doc.moderationHistory = doc.moderationHistory.slice(-30);
  }
}

function mapPostItem(post) {
  return {
    contentType: 'post',
    id: String(post._id),
    text: post.text,
    publicationType: post.publicationType,
    user: post.user,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    isReported: Boolean(post.isReported),
    reportStatus: post.reportStatus || 'open',
    reportCount: post.reports?.length || 0,
    deletedAt: post.deletedAt || null,
    commentsCount: post.commentsCount || 0,
    reactionsCount: post.reactionsCount,
    matchInfo: post.matchInfo,
  };
}

function mapCommentItem(comment, postId) {
  return {
    contentType: 'comment',
    id: String(comment._id),
    postId: String(postId || comment.post),
    text: comment.text,
    user: comment.user,
    createdAt: comment.createdAt,
    isReported: Boolean(comment.isReported),
    reportStatus: comment.reportStatus || 'open',
    reportCount: comment.reports?.length || 0,
    deletedAt: comment.deletedAt || null,
  };
}

/**
 * GET /api/admin/moderation/content
 */
router.get('/content', auth, checkAdmin, async (req, res) => {
  try {
    const {
      contentType = 'all',
      userId,
      createdFrom,
      createdTo,
      reported,
      publicationType,
      q,
      includeDeleted,
      page = '1',
      limit = '40',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 40));
    const from = parseDateQuery(createdFrom);
    const to = parseDateQuery(createdTo, true);

    const items = [];

    if (contentType === 'all' || contentType === 'post') {
      const postFilter = {};
      if (!includeDeleted || includeDeleted === 'false') {
        Object.assign(postFilter, notDeletedFilter());
      } else if (includeDeleted === 'only') {
        postFilter.deletedAt = { $ne: null };
      }
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        postFilter.user = userId;
      }
      if (publicationType) postFilter.publicationType = publicationType;
      if (reported === 'true') postFilter.isReported = true;
      if (reported === 'false') postFilter.isReported = { $ne: true };
      if (from || to) {
        postFilter.createdAt = {};
        if (from) postFilter.createdAt.$gte = from;
        if (to) postFilter.createdAt.$lte = to;
      }
      if (q?.trim()) {
        postFilter.text = { $regex: q.trim(), $options: 'i' };
      }

      const posts = await CommunityPost.find(postFilter)
        .populate('user', 'nombre email role communityBlocked communityMutedUntil')
        .sort({ createdAt: -1 })
        .limit(contentType === 'post' ? limitNum : 200)
        .lean();

      posts.forEach((p) => items.push(mapPostItem(p)));
    }

    if (contentType === 'all' || contentType === 'comment') {
      const commentFilter = {};
      if (!includeDeleted || includeDeleted === 'false') {
        Object.assign(commentFilter, notDeletedFilter());
      } else if (includeDeleted === 'only') {
        commentFilter.deletedAt = { $ne: null };
      }
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        commentFilter.user = userId;
      }
      if (reported === 'true') commentFilter.isReported = true;
      if (reported === 'false') commentFilter.isReported = { $ne: true };
      if (from || to) {
        commentFilter.createdAt = {};
        if (from) commentFilter.createdAt.$gte = from;
        if (to) commentFilter.createdAt.$lte = to;
      }
      if (q?.trim()) {
        commentFilter.text = { $regex: q.trim(), $options: 'i' };
      }

      const comments = await PostComment.find(commentFilter)
        .populate('user', 'nombre email role communityBlocked communityMutedUntil')
        .populate('post', 'publicationType text')
        .sort({ createdAt: -1 })
        .limit(contentType === 'comment' ? limitNum : 200)
        .lean();

      comments.forEach((c) => items.push(mapCommentItem(c, c.post?._id)));
    }

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = items.length;
    const start = (pageNum - 1) * limitNum;
    const paged = items.slice(start, start + limitNum);

    res.json({
      success: true,
      data: {
        items: paged,
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    logger.error('admin_moderation_content_list_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al listar contenido' });
  }
});

/**
 * GET /api/admin/moderation/content/:contentType/:id
 */
router.get('/content/:contentType/:id', auth, checkAdmin, async (req, res) => {
  try {
    const { contentType, id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    if (contentType === 'post') {
      const post = await CommunityPost.findById(id)
        .populate('user', 'nombre email role communityBlocked communityMutedUntil')
        .populate('reports.user', 'nombre email')
        .populate('moderationHistory.actor', 'nombre email');
      if (!post) {
        return res.status(404).json({ success: false, message: 'Publicación no encontrada' });
      }
      const comments = await PostComment.find({ post: post._id, ...notDeletedFilter() })
        .populate('user', 'nombre email')
        .sort({ createdAt: 1 })
        .limit(50);
      return res.json({
        success: true,
        data: {
          ...mapPostItem(post),
          reports: post.reports,
          moderationHistory: post.moderationHistory,
          comments: comments.map((c) => mapCommentItem(c, post._id)),
        },
      });
    }

    if (contentType === 'comment') {
      const comment = await PostComment.findById(id)
        .populate('user', 'nombre email role communityBlocked communityMutedUntil')
        .populate('reports.user', 'nombre email')
        .populate('moderationHistory.actor', 'nombre email')
        .populate('post', 'text publicationType user');
      if (!comment) {
        return res.status(404).json({ success: false, message: 'Comentario no encontrado' });
      }
      return res.json({
        success: true,
        data: {
          ...mapCommentItem(comment, comment.post?._id),
          reports: comment.reports,
          moderationHistory: comment.moderationHistory,
          post: comment.post,
        },
      });
    }

    return res.status(400).json({ success: false, message: 'contentType inválido' });
  } catch (error) {
    logger.error('admin_moderation_content_detail_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al obtener detalle' });
  }
});

/**
 * GET /api/admin/moderation/reports
 */
router.get('/reports', auth, checkAdmin, async (req, res) => {
  try {
    const { status = 'open', page = '1', limit = '30' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));

    const reportFilter = { isReported: true, ...notDeletedFilter() };
    if (status && status !== 'all') reportFilter.reportStatus = status;

    const [posts, comments] = await Promise.all([
      CommunityPost.find(reportFilter)
        .populate('user', 'nombre email')
        .populate('reports.user', 'nombre email')
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean(),
      PostComment.find(reportFilter)
        .populate('user', 'nombre email')
        .populate('reports.user', 'nombre email')
        .populate('post', 'text publicationType')
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean(),
    ]);

    const items = [
      ...posts.map((p) => ({
        ...mapPostItem(p),
        reports: p.reports,
        lastReportAt: p.reports?.length
          ? p.reports[p.reports.length - 1].createdAt
          : p.updatedAt,
      })),
      ...comments.map((c) => ({
        ...mapCommentItem(c, c.post?._id),
        reports: c.reports,
        postPreview: c.post?.text?.slice(0, 120),
        lastReportAt: c.reports?.length
          ? c.reports[c.reports.length - 1].createdAt
          : c.updatedAt,
      })),
    ].sort((a, b) => new Date(b.lastReportAt) - new Date(a.lastReportAt));

    const total = items.length;
    const start = (pageNum - 1) * limitNum;
    const paged = items.slice(start, start + limitNum);

    res.json({
      success: true,
      data: { items: paged, total, page: pageNum, limit: limitNum },
    });
  } catch (error) {
    logger.error('admin_moderation_reports_list_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al listar reportes' });
  }
});

async function softDeletePost(post, req, note) {
  if (post.deletedAt) return post;
  post.deletedAt = new Date();
  pushModerationHistory(post, 'delete_post', req.user.id, note);
  await post.save();
  logModerationAction('delete_post', req, {
    contentType: 'post',
    targetId: String(post._id),
    targetUserId: String(post.user),
    note,
  });
  return post;
}

router.delete('/posts/:id', auth, checkAdmin, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Publicación no encontrada' });
    }
    await softDeletePost(post, req, req.body?.note || '');
    res.json({ success: true, message: 'Publicación eliminada', id: String(post._id) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar publicación' });
  }
});

router.post('/posts/:id/restore', auth, checkAdmin, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Publicación no encontrada' });
    }
    post.deletedAt = null;
    pushModerationHistory(post, 'restore_post', req.user.id, req.body?.note || '');
    await post.save();
    logModerationAction('restore_post', req, {
      contentType: 'post',
      targetId: String(post._id),
    });
    res.json({ success: true, message: 'Publicación restaurada', id: String(post._id) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al restaurar publicación' });
  }
});

router.delete('/comments/:id', auth, checkAdmin, async (req, res) => {
  try {
    const comment = await PostComment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comentario no encontrado' });
    }
    if (!comment.deletedAt) {
      comment.deletedAt = new Date();
      const post = await CommunityPost.findById(comment.post);
      if (post) {
        post.commentsCount = Math.max(0, (post.commentsCount || 0) - 1);
        await post.save();
      }
      pushModerationHistory(comment, 'delete_comment', req.user.id, req.body?.note || '');
      await comment.save();
      logModerationAction('delete_comment', req, {
        contentType: 'comment',
        targetId: String(comment._id),
        postId: String(comment.post),
        targetUserId: String(comment.user),
      });
    }
    res.json({ success: true, message: 'Comentario eliminado', id: String(comment._id) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar comentario' });
  }
});

router.post('/comments/:id/restore', auth, checkAdmin, async (req, res) => {
  try {
    const comment = await PostComment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comentario no encontrado' });
    }
    if (comment.deletedAt) {
      comment.deletedAt = null;
      const post = await CommunityPost.findById(comment.post);
      if (post) {
        post.commentsCount = (post.commentsCount || 0) + 1;
        await post.save();
      }
      pushModerationHistory(comment, 'restore_comment', req.user.id, req.body?.note || '');
      await comment.save();
      logModerationAction('restore_comment', req, {
        contentType: 'comment',
        targetId: String(comment._id),
      });
    }
    res.json({ success: true, message: 'Comentario restaurado', id: String(comment._id) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al restaurar comentario' });
  }
});

router.post('/users/:userId/block', auth, checkAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    if (user.isMainAdmin) {
      return res.status(403).json({ success: false, message: 'No se puede bloquear al admin principal' });
    }
    user.communityBlocked = true;
    await user.save();
    logModerationAction('block_user', req, {
      targetUserId: String(user._id),
      email: user.email,
      note: req.body?.note || '',
    });
    res.json({
      success: true,
      message: 'Usuario bloqueado en comunidad',
      userId: String(user._id),
      communityBlocked: true,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al bloquear usuario' });
  }
});

router.post('/users/:userId/unblock', auth, checkAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    user.communityBlocked = false;
    await user.save();
    logModerationAction('unblock_user', req, { targetUserId: String(user._id), email: user.email });
    res.json({ success: true, message: 'Bloqueo levantado', userId: String(user._id) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al desbloquear usuario' });
  }
});

router.post('/users/:userId/mute', auth, checkAdmin, async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, parseInt(req.body?.days, 10) || 7));
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    if (user.isMainAdmin) {
      return res.status(403).json({ success: false, message: 'No se puede silenciar al admin principal' });
    }
    const until = new Date();
    until.setDate(until.getDate() + days);
    user.communityMutedUntil = until;
    await user.save();
    logModerationAction('mute_user', req, {
      targetUserId: String(user._id),
      email: user.email,
      days,
      mutedUntil: until.toISOString(),
    });
    res.json({
      success: true,
      message: `Usuario silenciado ${days} días`,
      userId: String(user._id),
      communityMutedUntil: until,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al silenciar usuario' });
  }
});

router.post('/users/:userId/unmute', auth, checkAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    user.communityMutedUntil = null;
    await user.save();
    logModerationAction('unmute_user', req, { targetUserId: String(user._id), email: user.email });
    res.json({ success: true, message: 'Silencio levantado', userId: String(user._id) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al quitar silencio' });
  }
});

/**
 * POST /api/admin/moderation/reports/:contentType/:id/resolve
 * body: { action: 'dismiss' | 'delete_content', note }
 */
router.post('/reports/:contentType/:id/resolve', auth, checkAdmin, async (req, res) => {
  try {
    const { contentType, id } = req.params;
    const { action = 'dismiss', note = '' } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido' });
    }

    let doc;
    if (contentType === 'post') {
      doc = await CommunityPost.findById(id);
    } else if (contentType === 'comment') {
      doc = await PostComment.findById(id);
    } else {
      return res.status(400).json({ success: false, message: 'contentType inválido' });
    }

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Contenido no encontrado' });
    }

    if (action === 'delete_content') {
      if (contentType === 'post') {
        await softDeletePost(doc, req, note || 'Resuelto por reporte');
      } else {
        if (!doc.deletedAt) {
          doc.deletedAt = new Date();
          const post = await CommunityPost.findById(doc.post);
          if (post) {
            post.commentsCount = Math.max(0, (post.commentsCount || 0) - 1);
            await post.save();
          }
        }
        pushModerationHistory(doc, 'delete_comment', req.user.id, note || 'Resuelto por reporte');
        await doc.save();
        logModerationAction('delete_comment', req, {
          contentType: 'comment',
          targetId: String(doc._id),
          via: 'report_resolve',
        });
      }
      doc.reportStatus = 'resolved';
    } else {
      doc.reportStatus = 'dismissed';
    }

    pushModerationHistory(doc, `report_${action}`, req.user.id, note);
    doc.isReported = doc.reportStatus === 'open';
    await doc.save();

    logModerationAction('resolve_report', req, {
      contentType,
      targetId: String(doc._id),
      reportAction: action,
      reportStatus: doc.reportStatus,
      note,
    });

    res.json({
      success: true,
      message: 'Reporte procesado',
      reportStatus: doc.reportStatus,
      id: String(doc._id),
    });
  } catch (error) {
    logger.error('admin_moderation_resolve_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al resolver reporte' });
  }
});

module.exports = router;
