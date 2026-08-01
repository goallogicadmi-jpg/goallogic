const User = require('../models/User');

function slugifyPublicName(nombre, apellido = '') {
  const full = `${nombre || ''} ${apellido || ''}`.trim();
  const normalized = full
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return (normalized || 'USUARIO').slice(0, 48);
}

async function buildUniquePublicId(nombre, apellido = '') {
  const base = slugifyPublicName(nombre, apellido);

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const digits = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    const candidate = `${base}-${digits}`;
    const exists = await User.exists({ publicId: candidate });
    if (!exists) return candidate;
  }

  const fallbackDigits = String(Date.now()).slice(-3);
  return `${base}-${fallbackDigits}`;
}

async function ensureUserPublicId(userOrId) {
  const user =
    userOrId && userOrId._id
      ? userOrId
      : await User.findById(userOrId).select('_id nombre apellido publicId').lean();

  if (!user) return null;
  if (user.publicId) return user.publicId;

  const publicId = await buildUniquePublicId(user.nombre, user.apellido);
  await User.updateOne({ _id: user._id, publicId: { $in: [null, ''] } }, { $set: { publicId } });
  return publicId;
}

function mapSubscriberPublicView(user) {
  if (!user) return null;
  return {
    publicId: user.publicId || null,
    name: user.nombre || 'Usuario',
  };
}

module.exports = {
  slugifyPublicName,
  buildUniquePublicId,
  ensureUserPublicId,
  mapSubscriberPublicView,
};
