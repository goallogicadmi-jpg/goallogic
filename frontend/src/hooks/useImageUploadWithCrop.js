import { useRef, useState } from 'react';
import { uploadImage } from '../services/uploadService';
import { blobToFile } from '../utils/cropImage';

/**
 * Hook reutilizable: selección → recorte → subida Cloudinary.
 */
export function useImageUploadWithCrop({
  folder,
  uploadFn,
  aspect = 1,
  cropTitle = 'Recortar imagen',
  validateFile,
  onUploaded,
}) {
  const inputRef = useRef(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState('');
  const [pendingName, setPendingName] = useState('image.jpg');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const revokeCropSrc = () => {
    if (cropSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(cropSrc);
    }
  };

  const openFilePicker = () => inputRef.current?.click();

  const handleFileSelected = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validation = validateFile?.(file);
    if (validation) {
      setError(validation);
      return;
    }

    setError('');
    revokeCropSrc();
    setPendingName(file.name || 'image.jpg');
    setCropSrc(URL.createObjectURL(file));
    setCropOpen(true);
  };

  const handleCropCancel = () => {
    setCropOpen(false);
    revokeCropSrc();
    setCropSrc('');
  };

  const handleCropComplete = async (blob) => {
    setUploading(true);
    setError('');
    try {
      const file = blobToFile(blob, pendingName.replace(/\.\w+$/, '.jpg'));
      const url = uploadFn
        ? await uploadFn(file)
        : await uploadImage(file, folder);
      onUploaded?.(url);
      setCropOpen(false);
      revokeCropSrc();
      setCropSrc('');
    } catch (err) {
      setError(err.message || 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  return {
    inputRef,
    cropOpen,
    cropSrc,
    cropAspect: aspect,
    cropTitle,
    uploading,
    error,
    openFilePicker,
    handleFileSelected,
    handleCropComplete,
    handleCropCancel,
  };
}
