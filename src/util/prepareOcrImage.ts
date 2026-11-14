import { enhanceForOcr } from "@/util/enhanceForOcr";

/**
 * Evens out lighting and contrast so Tesseract can read phone photos. Falls
 * back to the original blob if the browser can't decode or draw it.
 */
export async function prepareOcrImage(blob: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(blob);
    try {
      const { width, height } = bitmap;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return blob;
      ctx.drawImage(bitmap, 0, 0);

      const imageData = ctx.getImageData(0, 0, width, height);
      enhanceForOcr(imageData.data, width, height);
      ctx.putImageData(imageData, 0, 0);

      const prepared = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      return prepared ?? blob;
    } finally {
      bitmap.close();
    }
  } catch {
    return blob;
  }
}
