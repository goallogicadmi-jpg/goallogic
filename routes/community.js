const router = require('express').Router();
const auth = require('../middleware/auth');
const { authJwt } = require('../middleware/auth');
const checkAdmin = require('../middleware/checkAdmin');
const CommunityPost = require('../models/CommunityPost');
const PostComment = require('../models/PostComment');
const PostReaction = require('../models/PostReaction');
const { containsBannedWords } = require('../utils/contentFilter');

const { communityPostLimiter } = require('../middleware/routeRateLimits');

// Crear post
router.post('/posts', communityPostLimiter, auth, async (req, res) => {
  try {
    const {
      publicationType,
      matchInfo,
      statsUsed,
      probability,
      text,
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
    });

    res.status(201).json(post);
  } catch (err) {
    console.error('Error creando post:', err);
    res.status(500).json({ message: 'Error al crear el análisis' });
  }
});

// Listar posts (JWT sin exigir premium: usuarios en proceso de pago pueden ver el feed)
router.get('/posts', authJwt, async (req, res) => {
  try {
    const { model, publicationType, matchId, sort = 'recent', analyst, limit } = req.query;

    const filter = {};
    if (publicationType) filter.publicationType = publicationType;
    if (model) filter.modelUsed = model;
    if (matchId) filter.matchId = matchId;
    if (analyst) filter.user = analyst;

    let query = CommunityPost.find(filter)
      .populate('user', 'nombre email')
      .sort({ createdAt: -1 });

    if (sort === 'top') {
      query = query.sort({ 'reactionsCount.useful': -1, 'reactionsCount.like': -1 });
    }

    // Permitir limit personalizado (por defecto 50)
    const limitValue = limit ? parseInt(limit, 10) : 50;
    const posts = await query.limit(limitValue);
    res.json(posts);
  } catch (err) {
    console.error('Error obteniendo posts:', err);
    res.status(500).json({ message: 'Error al obtener el feed' });
  }
});

// Detalle de post
router.get('/posts/:id', authJwt, async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id)
      .populate('user', 'nombre email');
    if (!post) return res.status(404).json({ message: 'No encontrado' });

    const comments = await PostComment.find({ post: post._id })
      .populate('user', 'nombre')
      .sort({ createdAt: 1 });

    res.json({ post, comments });
  } catch (err) {
    console.error('Error obteniendo post:', err);
    res.status(500).json({ message: 'Error al obtener el post' });
  }
});

// Comentar
router.post('/posts/:id/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (containsBannedWords(text)) {
      return res.status(400).json({
        message: 'El comentario no puede incluir términos relacionados con apuestas.',
      });
    }

    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    const comment = await PostComment.create({
      post: post._id,
      user: req.user.id,
      text,
    });

    post.commentsCount += 1;
    await post.save();

    const populatedComment = await PostComment.findById(comment._id)
      .populate('user', 'nombre');

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

    await PostComment.deleteMany({ post: post._id });
    await PostReaction.deleteMany({ post: post._id });
    await post.deleteOne();

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

    await comment.deleteOne();
    post.commentsCount = Math.max(0, (post.commentsCount || 0) - 1);
    await post.save();

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
    const { reason } = req.body;
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post no encontrado' });

    post.isReported = true;
    post.reports.push({
      user: req.user.id,
      reason: reason?.slice(0, 300),
    });
    await post.save();

    res.json({ message: 'Publicación reportada para revisión' });
  } catch (err) {
    console.error('Error reportando post:', err);
    res.status(500).json({ message: 'Error al reportar la publicación' });
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
