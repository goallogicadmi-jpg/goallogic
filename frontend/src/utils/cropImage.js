function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.crossOrigin = 'anonymous';
    image.src = url;
  });
}

/**
 * Genera un Blob JPEG recortado a partir del área en píxeles (react-easy-crop).
 */
export async function getCroppedImageBlob(imageSrc, pixelCrop, mimeType = 'image/jpeg') {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx || !pixelCrop?.width || !pixelCrop?.height) {
    throw new Error('No se pudo procesar el recorte');
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('No se pudo generar la imagen recortada'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      0.92
    );
  });
}

export function blobToFile(blob, filename = 'image.jpg') {
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}
