import { UserInitialAvatar } from './UserInitialAvatar';

/**
 * Avatar con foto de Cloudinary o inicial por defecto.
 */
export function UserAvatar({
  nombre,
  foto_perfil_url,
  size = 40,
  className = '',
  alt = '',
}) {
  const px = typeof size === 'number' ? size : 40;

  if (foto_perfil_url) {
    return (
      <img
        src={foto_perfil_url}
        alt={alt || nombre || 'Avatar'}
        className={`user-avatar-img ${className}`.trim()}
        style={{ width: px, height: px, minWidth: px, minHeight: px }}
        loading="lazy"
      />
    );
  }

  return (
    <UserInitialAvatar
      nombre={nombre}
      size={size}
      className={className}
    />
  );
}

export default UserAvatar;
