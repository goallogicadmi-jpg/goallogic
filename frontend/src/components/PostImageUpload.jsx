import { useRef } from 'react';
import { validateAvatarFile, uploadPostImage } from '../services/uploadService';
import { useImageUploadWithCrop } from '../hooks/useImageUploadWithCrop';
import ImageCropModal from './ImageCropModal';
import './PostImageUpload.css';

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 16V4M12 4L8 8M12 4L16 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Subida de imagen para publicaciones premium de analistas.
 */
export default function PostImageUpload({
  value,
  onChange,
  label = 'Imagen de la publicación (opcional)',
  disabled = false,
}) {
  const dropzoneRef = useRef(null);

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
    uploadFn: uploadPostImage,
    aspect: 16 / 9,
    cropTitle: 'Recortar imagen de publicación',
    validateFile: validateAvatarFile,
    onUploaded: onChange,
  });

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    dropzoneRef.current?.classList.remove('is-dragover');
    if (disabled || uploading) return;

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    handleFileSelected({
      target: { files: [file], value: '' },
    });
  }

  function handleDragOver(event) {
    event.preventDefault();
    if (!disabled && !uploading) {
      dropzoneRef.current?.classList.add('is-dragover');
    }
  }

  function handleDragLeave() {
    dropzoneRef.current?.classList.remove('is-dragover');
  }

  return (
    <div className="post-image-upload">
      <span className="post-image-upload__label">{label}</span>

      <div
        ref={dropzoneRef}
        className={`post-image-upload__dropzone${value ? ' has-preview' : ''}${uploading ? ' is-uploading' : ''}`}
        onClick={() => {
          if (!disabled && !uploading && !value) openFilePicker();
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={disabled || uploading ? -1 : 0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!disabled && !uploading) openFilePicker();
          }
        }}
        aria-label={value ? 'Imagen de publicación cargada' : 'Subir imagen de publicación'}
      >
        {value ? (
          <>
            <img src={value} alt="Vista previa de publicación" className="post-image-upload__preview" />
            <div className="post-image-upload__preview-actions">
              <button
                type="button"
                className="post-image-upload__action-btn"
                onClick={(event) => {
                  event.stopPropagation();
                  openFilePicker();
                }}
                disabled={disabled || uploading}
              >
                {uploading ? 'Subiendo…' : 'Cambiar imagen'}
              </button>
              <button
                type="button"
                className="post-image-upload__action-btn post-image-upload__action-btn--muted"
                onClick={(event) => {
                  event.stopPropagation();
                  onChange?.('');
                }}
                disabled={disabled || uploading}
              >
                Quitar
              </button>
            </div>
          </>
        ) : (
          <div className="post-image-upload__dropzone-content">
            <span className="post-image-upload__dropzone-icon">
              <UploadIcon />
            </span>
            <span className="post-image-upload__dropzone-title">
              {uploading ? 'Subiendo imagen…' : 'Subir imagen'}
            </span>
            <span className="post-image-upload__dropzone-hint">
              Arrastra una imagen aquí o haz clic para seleccionar
            </span>
            <span className="post-image-upload__dropzone-meta">
              JPG, PNG o WEBP · máx. 2MB · recorte 16:9
            </span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="post-image-upload__input"
        onChange={handleFileSelected}
        disabled={disabled || uploading}
        tabIndex={-1}
      />

      {error ? <p className="post-image-upload__error">{error}</p> : null}

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
