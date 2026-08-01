import { useRef, useState } from 'react';
import { validateAvatarFile } from '../services/uploadService';
import { UserAvatar } from './UserAvatar';
import ImageCropModal from './ImageCropModal';
import { useImageUploadWithCrop } from '../hooks/useImageUploadWithCrop';
import './AvatarUpload.css';

/**
 * Selector + recorte + subida de avatar a Cloudinary.
 */
export default function AvatarUpload({
  value,
  onChange,
  folder = 'users',
  nombre = '',
  label = 'Foto de perfil',
  disabled = false,
}) {
  const {
    inputRef,
    cropOpen,
    cropSrc,
    cropAspect,
    cropTitle,
    uploading,
    error,
    openFilePicker,
    handleFileSelected,
    handleCropComplete,
    handleCropCancel,
  } = useImageUploadWithCrop({
    folder,
    aspect: 1,
    cropTitle: 'Recortar foto de perfil',
    validateFile: validateAvatarFile,
    onUploaded: onChange,
  });

  return (
    <div className="avatar-upload">
      <span className="avatar-upload__label">{label}</span>
      <div className="avatar-upload__row">
        <UserAvatar nombre={nombre} foto_perfil_url={value} size={72} className="avatar-upload__preview" />
        <div className="avatar-upload__actions">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            className="avatar-upload__input"
            onChange={handleFileSelected}
            disabled={disabled || uploading}
          />
          <button
            type="button"
            className="admin-btn-secondary avatar-upload__btn"
            onClick={openFilePicker}
            disabled={disabled || uploading}
          >
            {uploading ? 'Subiendo…' : 'Subir imagen'}
          </button>
          {value ? (
            <button
              type="button"
              className="admin-btn-secondary avatar-upload__btn"
              onClick={() => onChange?.('')}
              disabled={disabled || uploading}
            >
              Quitar
            </button>
          ) : null}
          <small className="avatar-upload__hint">JPG, PNG o WEBP · máx. 2MB · recorte cuadrado</small>
        </div>
      </div>
      {error ? <p className="avatar-upload__error">{error}</p> : null}

      <ImageCropModal
        open={cropOpen}
        imageSrc={cropSrc}
        aspect={cropAspect}
        title={cropTitle}
        onCancel={handleCropCancel}
        onComplete={handleCropComplete}
      />
    </div>
  );
}
