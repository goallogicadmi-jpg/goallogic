const router = require('express').Router();
const auth = require('../middleware/auth');
const { authJwt } = require('../middleware/auth');
const checkAdmin = require('../middleware/checkAdmin');
const CommunityPost = require('../models/CommunityPost');
const PostComment = require('../models/PostComment');
const PostReaction = require('../models/PostReaction');
const User = require('../models/User');
const { containsBannedWords } = require('../utils/contentFilter');
const logger = require('../utils/logger');
const {
  getCommunityRestriction,
  notDeletedFilter,
  logModerationAction,
} = require('../utils/moderationHelpers');
const {
  getSettingBoolean,
  getSettingNumber,
} = require('../utils/systemSettingsService');
const { getAnalystBetStats, isSportsAnalyst } = require('../utils/analystStats');
const AnalystSubscription = require('../models/AnalystSubscription');
const { isRequesterAnalyst, forbidAnalystPrivateData } = require('../utils/analystPrivacy');
const { isCloudinaryAssetUrl } = require('../utils/cloudinaryAvatar');

const { communityPostLimiter } = require('../middleware/routeRateLimits');

async function loadParticipationUser(userId) {
  return User.findById(userId).select(
    'communityBlocked communityMutedUntil role isMainAdmin nombre email'
  );
}

function stripPrivateUserFieldsFromPosts(posts, req) {
  if (!isRequesterAnalyst(req)) return posts;
  return posts.map((post) => {
    const plain = post.toObject ? post.toObject() : { ...post };
    if (plain.user && typeof plain.user === 'object') {
      delete plain.user.email;
      delete plain.user.telefono;
      delete plain.user.direccion;
    }
    return plain;
  });
}

// Crear post
router.post('/posts', communityPostLimiter, auth, async (req, res) => {
  try {
    const author = await loadParticipationUser(req.user.id);
    const restriction = getCommunityRestriction(author);
    if (!restriction.canParticipate) {
      return res.status(403).json({ message: restriction.reason });
    }

    if (author?.role === 'analista') {
      const analystProfile = await User.findById(req.user.id)
        .select('analystPostsBlocked analystStatus')
        .lean();
      if (analystProfile?.analystPostsBlocked || analystProfile?.analystStatus === 'suspended') {
        return res.status(403).json({
          message: 'Tus publicaciones están bloqueadas. Contacta con administración.',
        });
      }
    }

    const {
      publicationType,
      matchInfo,
      statsUsed,
      probability,
      text,
      imagen_url: rawImagenUrl,
    } = req.body;

    if (!publicationType) {
      return res.status(400).json({ message: 'El tipo de publicación es obligatorio' });
    }

    if (!text?.trim()) {
      return res.status(400).json({ message: 'El contenido de la publicación es obligatorio' });
    }

    if (containsBannedWords(text)) {
      return res.status(400).json({
        message: 'El contenido no puede incluir términos relacionados con apuestas.',
      });
    }

    const isComment = publicationType === 'Comentario';

    if (!isComment) {
      if (!matchInfo?.homeTeam?.trim() || !matchInfo?.awayTeam?.trim() || !matchInfo?.league?.trim()) {
        return res.status(400).json({
          message: 'Equipo local, visitante y liga son obligatorios para este tipo de publicación',
        });
      }
    }

    let imagen_url = '';
    if (rawImagenUrl && String(rawImagenUrl).trim()) {
      if (author?.role !== 'analista') {
        return res.status(403).json({ message: 'Solo los analistas pueden adjuntar imágenes a publicaciones' });
      }
      imagen_url = String(rawImagenUrl).trim();
      if (!isCloudinaryAssetUrl(imagen_url)) {
        return res.status(400).json({ message: 'La URL de imagen no es válida' });
      }
    }

    const post = await CommunityPost.create({
      user: req.user.id,
      publicationType,
      matchId: isComment
        ? ''
        : `${matchInfo.homeTeam}-${matchInfo.awayTeam}-${Date.now()}`,
      matchInfo: isComment ? {} : {
        ...matchInfo,
        startTime: matchInfo?.startTime ? new Date(matchInfo.startTime) : new Date(),
      },
      statsUsed: isComment ? [] : (statsUsed || []),
      probability: isComment ? '' : (probability?.trim() || ''),
      text: text.trim(),
      imagen_url: imagen_url || undefined,
    });

    res.status(201).json(post);
  } catch (err) {
    console.error('Error creando post:', err);
    res.status(500).json({ message: 'Error al crear el análisis' });
  }
});

async function enrichPostsWithAnalystData(posts, viewerUserId) {
  const analystIds = [
    ...new Set(
      posts
        .filter((p) => p.user && isSportsAnalyst(p.user))
        .map((p) => String(p.user._id || p.user))
    ),
  ];

  if (!analystIds.length) return posts;

  const statsMap = new Map();
  await Promise.all(
    analystIds.map(async (id) => {
      const stats = await getAnalystBetStats(id);
      statsMap.set(id, stats);
    })
  );

  let subscribedSet = new Set();
  if (viewerUserId) {
    const subs = await AnalystSubscription.find({
      subscriberId: viewerUserId,
      analystId: { $in: analystIds },
      status: { $in: ['active', 'trialing', 'past_due'] },
    })
      .select('analystId')
      .lean();
    subscribedSet = new Set(subs.map((s) => String(s.analystId)));
  }

  return posts.map((post) => {
    const author = post.user;
    if (!author || !isSportsAnalyst(author)) return post;
    const authorId = String(author._id || author);
    const stats = statsMap.get(authorId);
    const plain = post.toObject ? post.toObject() : { ...post };
    if (plain.user && typeof plain.user === 'object') {
      plain.user.hasStripePrice = Boolean(plain.user.analystStripePriceId);
    }
    plain.isAnalystPremiumPost = true;
    plain.analystStats = stats
      ? {
          currentStreak: stats.currentStreak,
          winRate: stats.winRate,
          roi: stats.roi,
          historySummary: stats.historySummary,
        }
      : null;
    plain.viewerSubscribedToAnalyst =
      subscribedSet.has(authorId) || (viewerUserId && String(viewerUserId) === authorId);
    return plain;
  });
}

// Listar posts (JWT sin exigir premium: usuarios en proceso de pago pueden ver el feed)
router.get('/posts', authJwt, async (req, res) => {
  try {
    const { model, publicationType, matchId, sort = 'recent', analyst, limit } = req.query;

    const filter = { ...notDeletedFilter() };
    if (publicationType) filter.publicationType = publicationType;
    if (model) filter.modelUsed = model;
    if (matchId) filter.matchId = matchId;
    if (analyst) filter.user = analyst;

    let query = CommunityPost.find(filter)
      .populate('user', 'nombre publicId role pais foto_perfil_url analystVerifiedAt analystStripePriceId analystSubscriptionPriceCents')
      .sort({ createdAt: -1 });

    if (sort === 'top') {
      query = query.sort({ 'reactionsCount.useful': -1, 'reactionsCount.like': -1 });
    }

    const limitValue = limit ? parseInt(limit, 10) : 50;
    const posts = await query.limit(limitValue);
    let enriched = await enrichPostsWithAnalystData(posts, req.user?.id);
    enriched = stripPrivateUserFieldsFromPosts(enriched, req);
    res.json(enriched);
  } catch (err) {
    console.error('Error obteniendo posts:', err);
    res.status(500).json({ message: 'Error al obtener el feed' });
  }
});

// Detalle de post
router.get('/posts/:id', authJwt, async (req, res) => {
  try {
    const post = await CommunityPost.findOne({
      _id: req.params.id,
      ...notDeletedFilter(),
    }).populate(
      'user',
      'nombre publicId role pais foto_perfil_url analystVerifiedAt analystStripePriceId analystSubscriptionPriceCents'
    );
    if (!post) return res.status(404).json({ message: 'No encontrado' });

    const comments = await PostComment.find({ post: post._id, ...notDeletedFilter() })
      .populate('user', 'nombre publicId foto_perfil_url')
      .sort({ createdAt: 1 });

    const [enrichedPost] = await enrichPostsWithAnalystData([post], req.user?.id);
    let safePost = stripPrivateUserFieldsFromPosts([enrichedPost], req)[0];

    if (isRequesterAnalyst(req) && safePost.user && typeof safePost.user === 'object') {
      delete safePost.user.email;
    }

    res.json({ post: safePost, comments });
  } catch (err) {
    console.error('Error obteniendo post:', err);
    res.status(500).json({ message: 'Error al obtener el post' });
  }
});

// Comentar
router.post('/posts/:id/comments', auth, async (req, res) => {
  try {
    const author = await loadParticipationUser(req.user.id);
    const restriction = getCommunityRestriction(author);
    if (!restriction.canParticipate) {
      return res.status(403).json({ message: restriction.reason });
    }

    const { text } = req.body;

    if (containsBannedWords(text)) {
      return res.status(400).json({
        message: 'El comentario no puede incluir términos relacionados con apuestas.',
      });
    }

    const post = await CommunityPost.findOne({
      _id: req.params.id,
      ...notDeletedFilter(),
    });
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    const comment = await PostComment.create({
      post: post._id,
      user: req.user.id,
      text,
    });

    post.commentsCount += 1;
    await post.save();

    const populatedComment = await PostComment.findById(comment._id)
      .populate('user', 'nombre foto_perfil_url');

    res.status(201).json(populatedComment);
  } catch (err) {
    console.error('Error comentando:', err);
    res.status(500).json({ message: 'Error al comentar' });
  }
});

// Reaccionar
router.post('/posts/:id/reactions', auth, async (req, res) => {
  try {
    const { type } = req.body;
    if (!['like', 'useful'].includes(type)) {
      return res.status(400).json({ message: 'Tipo de reacción inválido' });
    }

    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    const existing = await PostReaction.findOne({
      post: post._id,
      user: req.user.id,
      type,
    });

    if (existing) {
      await existing.deleteOne();
      post.reactionsCount[type] = Math.max(0, post.reactionsCount[type] - 1);
    } else {
      await PostReaction.create({
        post: post._id,
        user: req.user.id,
        type,
      });
      post.reactionsCount[type] += 1;
    }

    await post.save();
    res.json({ reactionsCount: post.reactionsCount });
  } catch (err) {
    console.error('Error gestionando reacción:', err);
    res.status(500).json({ message: 'Error al gestionar la reacción' });
  }
});

// Admin: eliminar publicación (cualquier autor)
router.delete('/posts/:id', auth, checkAdmin, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }

    post.deletedAt = new Date();
    await post.save();
    await PostComment.updateMany({ post: post._id }, { deletedAt: new Date() });

    logModerationAction('delete_post', req, {
      contentType: 'post',
      targetId: String(post._id),
      targetUserId: String(post.user),
      via: 'community_route',
    });

    res.json({ message: 'Publicación eliminada', id: req.params.id });
  } catch (err) {
    console.error('Error eliminando post:', err);
    res.status(500).json({ message: 'Error al eliminar la publicación' });
  }
});

// Admin: eliminar comentario (cualquier autor)
router.delete('/posts/:postId/comments/:commentId', auth, checkAdmin, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post no encontrado' });
    }

    const comment = await PostComment.findOne({
      _id: req.params.commentId,
      post: post._id,
    });
    if (!comment) {
      return res.status(404).json({ message: 'Comentario no encontrado' });
    }

    comment.deletedAt = new Date();
    await comment.save();
    post.commentsCount = Math.max(0, (post.commentsCount || 0) - 1);
    await post.save();

    logModerationAction('delete_comment', req, {
      contentType: 'comment',
      targetId: String(comment._id),
      postId: String(post._id),
      via: 'community_route',
    });

    res.json({
      message: 'Comentario eliminado',
      commentId: req.params.commentId,
      commentsCount: post.commentsCount,
    });
  } catch (err) {
    console.error('Error eliminando comentario:', err);
    res.status(500).json({ message: 'Error al eliminar el comentario' });
  }
});

// Reportar
router.post('/posts/:id/report', auth, async (req, res) => {
  try {
    if (!getSettingBoolean('community.reports_enabled', true)) {
      return res.status(403).json({ message: 'Los reportes están deshabilitados temporalmente' });
    }

    const { reason } = req.body;
    const maxLen = getSettingNumber('community.max_report_reason_length', 300);
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    post.isReported = true;
    post.reportStatus = 'open';
    post.reports.push({
      user: req.user.id,
      reason: reason?.slice(0, maxLen),
    });
    await post.save();

    logger.info('community_post_reported', {
      postId: String(post._id),
      reporterId: String(req.user.id),
    });

    res.json({ message: 'Publicación reportada para revisión' });
  } catch (err) {
    console.error('Error reportando post:', err);
    res.status(500).json({ message: 'Error al reportar la publicación' });
  }
});

// Reportar comentario
router.post('/posts/:postId/comments/:commentId/report', auth, async (req, res) => {
  try {
    if (!getSettingBoolean('community.reports_enabled', true)) {
      return res.status(403).json({ message: 'Los reportes están deshabilitados temporalmente' });
    }

    const { reason } = req.body;
    const maxLen = getSettingNumber('community.max_report_reason_length', 300);
    const comment = await PostComment.findOne({
      _id: req.params.commentId,
      post: req.params.postId,
      ...notDeletedFilter(),
    });
    if (!comment) return res.status(404).json({ message: 'Comentario no encontrado' });

    comment.isReported = true;
    comment.reportStatus = 'open';
    comment.reports.push({
      user: req.user.id,
      reason: reason?.slice(0, maxLen),
    });
    await comment.save();

    logger.info('community_comment_reported', {
      commentId: String(comment._id),
      postId: String(req.params.postId),
      reporterId: String(req.user.id),
    });

    res.json({ message: 'Comentario reportado para revisión' });
  } catch (err) {
    console.error('Error reportando comentario:', err);
    res.status(500).json({ message: 'Error al reportar el comentario' });
  }
});

// Cache simple en memoria para notificaciones y badge "Hot"
const notificationCache = new Map();
const HOT_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Obtener contador de notificaciones (comentarios nuevos en posts del usuario)
router.get('/notifications/count', authJwt, async (req, res) => {
  try {
    const userId = req.user.id;
    const cacheKey = `notifications_${userId}`;
    const cached = notificationCache.get(cacheKey);

    // Verificar cache (60 segundos TTL para notificaciones)
    if (cached && Date.now() - cached.timestamp < 60 * 1000) {
      return res.json({ count: cached.count });
    }

    // Buscar posts del usuario
    const userPosts = await CommunityPost.find({ user: userId })
      .select('commentsCount _id')
      .lean();

    // Calcular total de comentarios nuevos
    // Por ahora, simplemente sumamos todos los comentarios
    // En el futuro se puede comparar con lastSeenCommentsCount
    let totalNewComments = 0;
    for (const post of userPosts) {
      // Si el post tiene comentarios, los contamos como "nuevos" por ahora
      // En Fase 2 se puede implementar lastSeenCommentsCount
      if (post.commentsCount > 0) {
        totalNewComments += post.commentsCount;
      }
    }

    // Guardar en cache
    notificationCache.set(cacheKey, {
      count: totalNewComments,
      timestamp: Date.now()
    });

    res.json({ count: totalNewComments });
  } catch (err) {
    console.error('Error obteniendo contador de notificaciones:', err);
    res.status(500).json({ message: 'Error al obtener notificaciones', count: 0 });
  }
});

// Obtener si hay posts "Hot" (alta actividad reciente)
router.get('/hot-indicator', authJwt, async (req, res) => {
  try {
    const cacheKey = 'hot_indicator';
    const cached = notificationCache.get(cacheKey);

    // Verificar cache (5 minutos TTL)
    if (cached && Date.now() - cached.timestamp < HOT_CACHE_TTL) {
      return res.json({ hasHotPosts: cached.hasHotPosts });
    }

    // Buscar posts con alta actividad en las últimas 24 horas
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const hotPosts = await CommunityPost.find({
      createdAt: { $gte: oneDayAgo },
      $expr: {
        $gt: [
          { $add: ['$reactionsCount.like', '$reactionsCount.useful'] },
          10
        ]
      }
    })
    .limit(1)
    .lean();

    const hasHotPosts = hotPosts.length > 0;

    // Guardar en cache
    notificationCache.set(cacheKey, {
      hasHotPosts,
      timestamp: Date.now()
    });

    res.json({ hasHotPosts });
  } catch (err) {
    console.error('Error obteniendo indicador Hot:', err);
    res.status(500).json({ message: 'Error al obtener indicador Hot', hasHotPosts: false });
  }
});

// Obtener estadísticas del usuario para gamificación
router.get('/user-stats', authJwt, async (req, res) => {
  try {
    const { userId } = req.query;
    const targetUserId = userId || req.user.id;

    if (
      isRequesterAnalyst(req) &&
      userId &&
      String(userId) !== String(req.user.id)
    ) {
      return forbidAnalystPrivateData(req, res);
    }

    // Verificar cache
    const cacheKey = `user_stats_${targetUserId}`;
    const cached = notificationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return res.json(cached.data);
    }

    // Obtener posts del usuario
    const userPosts = await CommunityPost.find({ user: targetUserId })
      .select('reactionsCount commentsCount createdAt')
      .lean();

    // Calcular estadísticas
    const totalUsefulReactions = userPosts.reduce((sum, post) => 
      sum + (post.reactionsCount?.useful || 0), 0
    );

    const highlightedPosts = userPosts.filter(post => 
      (post.reactionsCount?.useful || 0) >= 20
    ).length;

    // Posts de esta semana
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const postsThisWeek = userPosts.filter(post => 
      new Date(post.createdAt) >= oneWeekAgo
    ).length;

    const stats = {
      totalUsefulReactions,
      highlightedPosts,
      postsThisWeek,
      totalPosts: userPosts.length
    };

    // Guardar en cache
    notificationCache.set(cacheKey, {
      data: stats,
      timestamp: Date.now()
    });

    res.json(stats);
  } catch (err) {
    console.error('Error obteniendo estadísticas del usuario:', err);
    res.status(500).json({ 
      message: 'Error al obtener estadísticas',
      totalUsefulReactions: 0,
      highlightedPosts: 0,
      postsThisWeek: 0,
      totalPosts: 0
    });
  }
});

// Limpiar cache expirado periódicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of notificationCache.entries()) {
    const ttl = key.includes('hot') ? HOT_CACHE_TTL : 
                key.includes('user_stats') ? 5 * 60 * 1000 : 
                60 * 1000;
    if (now - value.timestamp > ttl) {
      notificationCache.delete(key);
    }
  }
}, 60000); // Limpiar cada minuto

module.exports = router;
