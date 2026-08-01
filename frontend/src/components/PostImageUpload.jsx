import { validateAvatarFile, uploadPostImage } from '../services/uploadService';
import { useImageUploadWithCrop } from '../hooks/useImageUploadWithCrop';
import ImageCropModal from './ImageCropModal';
import './PostImageUpload.css';

/**
 * Subida de imagen para publicaciones premium de analistas.
 */
export default function PostImageUpload({
  value,
  onChange,
  label = 'Imagen de la publicación (opcional)',
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
    uploadFn: uploadPostImage,
    aspect: 16 / 9,
    cropTitle: 'Recortar imagen de publicación',
    validateFile: validateAvatarFile,
    onUploaded: onChange,
  });

  return (
    <div className="post-image-upload">
      <span className="post-image-upload__label">{label}</span>

      {value ? (
        <div className="post-image-upload__preview-wrap">
          <img src={value} alt="Vista previa de publicación" className="post-image-upload__preview" />
        </div>
      ) : null}

      <div className="post-image-upload__actions">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          className="post-image-upload__input"
          onChange={handleFileSelected}
          disabled={disabled || uploading}
        />
        <button
          type="button"
          className="admin-btn-secondary"
          onClick={openFilePicker}
          disabled={disabled || uploading}
        >
          {uploading ? 'Subiendo…' : value ? 'Cambiar imagen' : 'Subir imagen'}
        </button>
        {value ? (
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={() => onChange?.('')}
            disabled={disabled || uploading}
          >
            Quitar
          </button>
        ) : null}
        <small className="post-image-upload__hint">JPG, PNG o WEBP · máx. 2MB · recorte 16:9</small>
      </div>

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
