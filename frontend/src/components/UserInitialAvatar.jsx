import React from 'react';
import { getUserInitial } from '../utils/userInitial';

/**
 * Avatar circular con la inicial del nombre (Comunidad y otros listados).
 */
export function UserInitialAvatar({ nombre, className = '', size = 40 }) {
  const initial = getUserInitial(nombre);
  const px = typeof size === 'number' ? size : 40;

  return (
    <div
      className={`user-initial-avatar ${className}`.trim()}
      style={{ width: px, height: px, minWidth: px, minHeight: px }}
      aria-hidden="true"
    >
      <span className="user-initial-avatar__letter">{initial}</span>
    </div>
  );
}
