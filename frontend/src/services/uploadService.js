import { getToken } from './authService';
import { resolveApiUrl } from '../config/apiBase.js';

/**
 * Sube una imagen a Cloudinary vía backend.
 * @param {File} file
 * @param {'users'|'analysts'|'analysts_posts'} folder
 */
export async function uploadImage(file, folder = 'users') {
  const token = getToken();
  if (!token) throw new Error('Debes iniciar sesión para subir una imagen');

  const formData = new FormData();
  formData.append('avatar', file);

  const res = await fetch(resolveApiUrl(`/api/upload/avatar?folder=${encodeURIComponent(folder)}`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Error al subir imagen');
  }

  return data.secure_url || data.url;
}

/**
 * Sube un avatar a Cloudinary vía backend.
 * @param {File} file
 * @param {'users'|'analysts'} folder
 */
export async function uploadAvatar(file, folder = 'users') {
  return uploadImage(file, folder);
}

export async function uploadPostImage(file) {
  const token = getToken();
  if (!token) throw new Error('Debes iniciar sesión para subir una imagen');

  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(resolveApiUrl('/api/upload/post-image'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Error al subir imagen');
  }

  return data.secure_url || data.url;
}

export async function saveProfilePhoto(foto_perfil_url) {
  const token = getToken();
  if (!token) throw new Error('Debes iniciar sesión');

  const res = await fetch(resolveApiUrl('/api/auth/profile/photo'), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ foto_perfil_url }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Error al guardar foto');
  return data;
}

export const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,image/jpg';
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export function validateAvatarFile(file) {
  if (!file) return 'Selecciona una imagen';
  if (file.size > AVATAR_MAX_BYTES) return 'La imagen no puede superar 2MB';
  const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type);
  if (!ok) return 'Formato no permitido (JPG, PNG o WEBP)';
  return null;
}
