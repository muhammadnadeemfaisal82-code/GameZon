const MAX_FIRESTORE_IMAGE_LENGTH = 550000;

export async function compressImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (JPG, PNG, or WebP).');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read selected image.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unsupported image format.'));
    image.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    if (dataUrl.length > MAX_FIRESTORE_IMAGE_LENGTH) {
      throw new Error('Image is too large. Please choose a smaller photo.');
    }
    return dataUrl;
  }

  const attempts = [
    { maxWidth: 1200, quality: 0.82 },
    { maxWidth: 960, quality: 0.72 },
    { maxWidth: 760, quality: 0.62 },
    { maxWidth: 600, quality: 0.52 },
  ];

  for (const attempt of attempts) {
    const scale =
      img.width > attempt.maxWidth ? attempt.maxWidth / img.width : 1;
    const targetWidth = Math.max(1, Math.round(img.width * scale));
    const targetHeight = Math.max(1, Math.round(img.height * scale));

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const compressed = canvas.toDataURL('image/jpeg', attempt.quality);
    if (compressed.length <= MAX_FIRESTORE_IMAGE_LENGTH) {
      return compressed;
    }
  }

  throw new Error(
    'Selected photo exceeds Firestore 1MB document capacity even after compression. Please use a smaller image or an Image URL.',
  );
}
