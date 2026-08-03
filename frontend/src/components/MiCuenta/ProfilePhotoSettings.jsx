import { useEffect, useRef, useState } from 'react';
import { UserAvatar } from '../UserAvatar';
import ImageCropModal from '../ImageCropModal';
import { useImageUploadWithCrop } from '../../hooks/useImageUploadWithCrop';
import { saveProfilePhoto, validateAvatarFile } from '../../services/uploadService';
import './MiCuenta.css';

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20h9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ProfilePhotoSettings({ user, onUpdated }) {
  const [photoUrl, setPhotoUrl] = useState(user?.foto_perfil_url || '');
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const editorRef = useRef(null);

  const savedUrl = user?.foto_perfil_url || '';
  const hasChanges = photoUrl !== savedUrl;
  const uploadFolder = user?.role === 'analista' ? 'analysts' : 'users';

  const {
    inputRef,
    cropOpen,
    cropSrc,
    cropAspect,
    cropTitle,
    uploading,
    error: uploadError,
    openFilePicker,
    handleFileSelected,
    handleCropComplete,
    handleCropCancel,
  } = useImageUploadWithCrop({
    folder: uploadFolder,
    aspect: 1,
    cropTitle: 'Recortar foto de perfil',
    validateFile: validateAvatarFile,
    onUploaded: (url) => {
      setPhotoUrl(url);
      setMessage('');
      setError('');
    },
  });

  useEffect(() => {
    setPhotoUrl(user?.foto_perfil_url || '');
  }, [user?.foto_perfil_url]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handleClickOutside(event) {
      if (editorRef.current && !editorRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const displayError = error || uploadError;

  async function handleSave() {
    if (!hasChanges) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const data = await saveProfilePhoto(photoUrl);
      setMessage(data.message || (photoUrl ? 'Foto actualizada' : 'Foto eliminada'));
      setMenuOpen(false);
      onUpdated?.(data.foto_perfil_url);
    } catch (err) {
      setError(err.message || 'No se pudo guardar la foto');
    } finally {
      setSaving(false);
    }
  }

  function handleUploadClick() {
    setMenuOpen(false);
    openFilePicker();
  }

  function handleRemoveClick() {
    setPhotoUrl('');
    setMessage('');
    setError('');
    setMenuOpen(false);
  }

  return (
    <div className="profile-photo-editor" ref={editorRef}>
      <div className="profile-photo-container">
        <div className="profile-photo-wrapper">
          {photoUrl ? (
            <UserAvatar
              nombre={user?.nombre}
              foto_perfil_url={photoUrl}
              size={80}
              className="profile-photo-image"
            />
          ) : (
            <div className="profile-photo-placeholder">
              <UserAvatar nombre={user?.nombre} size={80} />
            </div>
          )}

          <button
            type="button"
            className="profile-photo-editor__trigger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Editar foto de perfil"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            disabled={uploading || saving}
          >
            <PencilIcon />
          </button>

          {menuOpen ? (
            <div className="profile-photo-editor__menu" role="menu">
              <button
                type="button"
                className="profile-photo-editor__menu-item"
                role="menuitem"
                onClick={handleUploadClick}
                disabled={uploading || saving}
              >
                Subir imagen
              </button>
              <button
                type="button"
                className="profile-photo-editor__menu-item"
                role="menuitem"
                onClick={handleRemoveClick}
                disabled={uploading || saving || (!photoUrl && !savedUrl)}
              >
                Quitar imagen
              </button>
              <button
                type="button"
                className="profile-photo-editor__menu-item profile-photo-editor__menu-item--primary"
                role="menuitem"
                onClick={handleSave}
                disabled={uploading || saving || !hasChanges}
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="profile-photo-editor__input"
        onChange={handleFileSelected}
        disabled={uploading || saving}
        tabIndex={-1}
      />

      {uploading ? (
        <p className="profile-photo-editor__feedback profile-photo-editor__feedback--muted">
          Subiendo imagen…
        </p>
      ) : null}
      {message ? (
        <p className="profile-photo-editor__feedback profile-photo-editor__feedback--success">
          {message}
        </p>
      ) : null}
      {displayError ? (
        <p className="profile-photo-editor__feedback profile-photo-editor__feedback--error">
          {displayError}
        </p>
      ) : null}

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
