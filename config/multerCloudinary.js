const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('./cloudinary');

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

const PROFESSIONAL_TRANSFORM = [
  { width: 800, height: 800, crop: 'fill', gravity: 'auto' },
];

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      cb(new Error('Formato no permitido. Usa JPG, PNG o WEBP.'));
      return;
    }
    cb(null, true);
  },
});

function uploadBufferToCloudinary(buffer, folder = 'goal_logic/users', transformation = PROFESSIONAL_TRANSFORM) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
}

module.exports = {
  memoryUpload,
  uploadBufferToCloudinary,
  MAX_FILE_SIZE,
  PROFESSIONAL_TRANSFORM,
};
