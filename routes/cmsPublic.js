const express = require('express');
const CMSItem = require('../models/CMSItem');
const {
  activateDueScheduledItems,
  mapCmsItem,
  buildPublicQuery,
} = require('../utils/cmsHelpers');

const router = express.Router();

/**
 * GET /api/cms/public
 * Contenido publicado para dashboard y banners (sin auth).
 */
router.get('/public', async (req, res) => {
  try {
    await activateDueScheduledItems();

    const [news, announcements, banners] = await Promise.all([
      CMSItem.find(buildPublicQuery('news'))
        .sort({ priority: -1, publishedAt: -1 })
        .limit(10)
        .lean(),
      CMSItem.find(buildPublicQuery('announcement'))
        .sort({ priority: -1, publishedAt: -1 })
        .limit(5)
        .lean(),
      CMSItem.find(buildPublicQuery('banner'))
        .sort({ priority: -1, publishedAt: -1 })
        .limit(5)
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        news: news.map((n) => mapCmsItem(n)),
        announcements: announcements.map((a) => mapCmsItem(a)),
        banners: banners.map((b) => mapCmsItem(b)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cargar contenido público' });
  }
});

module.exports = router;
