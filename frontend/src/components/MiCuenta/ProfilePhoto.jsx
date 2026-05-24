import React from 'react';
import { getUserInitial } from '../../utils/userInitial';
import './MiCuenta.css';

/**
 * Avatar del usuario: inicial del nombre en mayúscula dentro del círculo.
 * @param {string} nombre - Nombre del usuario
 * @param {string} [size] - 'default' (80px) o 'small' (40px)
 */
const ProfilePhoto = ({ nombre, size = 'default' }) => {
  const initial = getUserInitial(nombre);
  const sizeClass = size === 'small' ? 'profile-photo-wrapper--small' : '';

  return (
    <div className="profile-photo-container">
      <div className={`profile-photo-wrapper ${sizeClass}`.trim()}>
        <div className="profile-photo-placeholder">
          <span className="profile-photo-initials">{initial}</span>
        </div>
      </div>
    </div>
  );
};

export default ProfilePhoto;
