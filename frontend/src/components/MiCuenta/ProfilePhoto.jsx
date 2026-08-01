import React from 'react';
import { UserAvatar } from '../UserAvatar';
import './MiCuenta.css';

/**
 * Avatar del usuario con foto Cloudinary o inicial.
 */
const ProfilePhoto = ({ nombre, foto_perfil_url, size = 'default' }) => {
  const sizeClass = size === 'small' ? 'profile-photo-wrapper--small' : '';
  const px = size === 'small' ? 40 : 80;

  return (
    <div className="profile-photo-container">
      <div className={`profile-photo-wrapper ${sizeClass}`.trim()}>
        {foto_perfil_url ? (
          <UserAvatar
            nombre={nombre}
            foto_perfil_url={foto_perfil_url}
            size={px}
            className="profile-photo-image"
          />
        ) : (
          <div className="profile-photo-placeholder">
            <UserAvatar nombre={nombre} size={px} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePhoto;
