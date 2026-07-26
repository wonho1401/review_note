const RESIZE_MAX_DIMENSION = 1600;
const RESIZE_JPEG_QUALITY = 0.85;

export async function resizeImageBlob(
  blob: Blob,
  maxDimension: number = RESIZE_MAX_DIMENSION,
  quality: number = RESIZE_JPEG_QUALITY,
): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
    try {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const width = Math.round(bitmap.width * scale);
      const height = Math.round(bitmap.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return blob;
      ctx.drawImage(bitmap, 0, 0, width, height);

      const resized = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      return resized ?? blob;
    } finally {
      bitmap.close();
    }
  } catch {
    return blob;
  }
}
