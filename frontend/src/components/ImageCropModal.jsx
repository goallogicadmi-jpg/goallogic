import { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImageBlob } from '../utils/cropImage';
import './ImageCropModal.css';

export default function ImageCropModal({
  open,
  imageSrc,
  aspect = 1,
  title = 'Recortar imagen',
  onCancel,
  onComplete,
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const onCropComplete = useCallback((_croppedArea, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    setError('');
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      await onComplete?.(blob);
    } catch (err) {
      setError(err.message || 'No se pudo recortar la imagen');
    } finally {
      setProcessing(false);
    }
  };

  if (!open || !imageSrc) return null;

  return (
    <div className="image-crop-modal" role="dialog" aria-modal="true" aria-labelledby="image-crop-title">
      <div className="image-crop-modal__backdrop" onClick={onCancel} aria-hidden="true" />
      <div className="image-crop-modal__panel">
        <header className="image-crop-modal__header">
          <h3 id="image-crop-title">{title}</h3>
          <button type="button" className="image-crop-modal__close" onClick={onCancel} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className="image-crop-modal__crop-area">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="image-crop-modal__controls">
          <label className="image-crop-modal__zoom-label">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>
        </div>

        {error ? <p className="image-crop-modal__error">{error}</p> : null}

        <footer className="image-crop-modal__footer">
          <button type="button" className="admin-btn-secondary" onClick={onCancel} disabled={processing}>
            Cancelar
          </button>
          <button type="button" className="admin-btn-primary" onClick={handleConfirm} disabled={processing}>
            {processing ? 'Procesando…' : 'Aplicar recorte'}
          </button>
        </footer>
      </div>
    </div>
  );
}
