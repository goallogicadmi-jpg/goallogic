const cloudinary = require('../config/cloudinary');

function isCloudinaryAssetUrl(url) {
  return typeof url === 'string' && url.includes('res.cloudinary.com');
}

function extractPublicIdFromUrl(url) {
  if (!isCloudinaryAssetUrl(url)) return null;

  try {
    const withoutQuery = url.split('?')[0];
    const uploadIndex = withoutQuery.indexOf('/upload/');
    if (uploadIndex === -1) return null;

    let path = withoutQuery.slice(uploadIndex + '/upload/'.length);
    path = path.replace(/^v\d+\//, '');
    const dotIndex = path.lastIndexOf('.');
    if (dotIndex > -1) path = path.slice(0, dotIndex);
    return path || null;
  } catch {
    return null;
  }
}

async function deleteCloudinaryImageByUrl(url) {
  const publicId = extractPublicIdFromUrl(url);
  if (!publicId) return null;

  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch {
    return null;
  }
}

function resolveUploadedFileUrl(file) {
  if (!file) return null;
  return file.secure_url || file.path || file.url || null;
}

module.exports = {
  isCloudinaryAssetUrl,
  extractPublicIdFromUrl,
  deleteCloudinaryImageByUrl,
  resolveUploadedFileUrl,
};
