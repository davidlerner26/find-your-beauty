// Shrinks a photo before upload: keeps the proportion, caps the longest side and re-encodes as JPEG
export const resizeImage = async (file: File, maxSize = 1280, quality = 0.85) => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('resize-failed'))),
      'image/jpeg',
      quality,
    ),
  );
};
