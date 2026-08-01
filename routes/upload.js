const express = require('express');
const { authJwt } = require('../middleware/auth');
const { isCloudinaryConfigured } = require('../config/cloudinary');
const { memoryUpload, uploadBufferToCloudinary } = require('../config/multerCloudinary');
const { resolveUploadedFileUrl } = require('../utils/cloudinaryAvatar');
const logger = require('../utils/logger');

const router = express.Router();

function pickFolder(req, forcedFolder) {
  if (forcedFolder) return forcedFolder;
  const type = (req.query.folder || req.body?.folder || 'users').toLowerCase();
  if (type === 'analysts_posts') return 'goal_logic/analysts_posts';
  if (type === 'analysts') return 'goal_logic/analysts';
  return 'goal_logic/users';
}

function createUploadHandler({ forcedFolder, logLabel = 'upload_image' } = {}) {
  return (req, res) => {
    if (!isCloudinaryConfigured) {
      return res.status(503).json({
        success: false,
        message: 'Cloudinary no está configurado en el servidor.',
      });
    }

    const fieldName = forcedFolder ? 'image' : 'avatar';
    memoryUpload.single(fieldName)(req, res, async (err) => {
      if (err) {
        const isSize = err.code === 'LIMIT_FILE_SIZE';
        logger.warn(`${logLabel}_error`, { message: err.message, userId: req.user?.id });
        return res.status(isSize ? 413 : 400).json({
          success: false,
          message: isSize
            ? 'La imagen supera el límite de 2MB.'
            : err.message || 'Error al procesar la imagen',
        });
      }

      try {
        const file = req.file || (req.files && req.files[0]);
        if (!file?.buffer) {
          return res.status(400).json({ success: false, message: 'No se recibió ninguna imagen' });
        }

        const folder = pickFolder(req, forcedFolder);
        const result = await uploadBufferToCloudinary(file.buffer, folder);
        const url = resolveUploadedFileUrl(result);

        if (!url) {
          return res.status(500).json({ success: false, message: 'Error al obtener URL de Cloudinary' });
        }

        res.json({
          success: true,
          url,
          secure_url: url,
          public_id: result.public_id,
          folder,
        });
      } catch (uploadErr) {
        logger.error(`${logLabel}_cloudinary_error`, { message: uploadErr.message });
        res.status(500).json({ success: false, message: 'Error al subir imagen a Cloudinary' });
      }
    });
  };
}

router.post('/avatar', authJwt, createUploadHandler({ logLabel: 'upload_avatar' }));

router.post('/post-image', authJwt, createUploadHandler({
  forcedFolder: 'goal_logic/analysts_posts',
  logLabel: 'upload_post_image',
}));

module.exports = router;
