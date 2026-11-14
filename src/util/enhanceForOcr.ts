// Ignore this share of the darkest/brightest pixels when picking the stretch
// range, so a few specks of pure black or glare don't defeat the stretch.
const CLIP_RATIO = 0.01;
// Below this spread the image is effectively flat (blank page); stretching it
// would only amplify noise.
const MIN_SPREAD = 16;
// Background window radius as a share of the long side. It must be much larger
// than a glyph so the local mean tracks lighting, not the text itself.
const BACKGROUND_RADIUS_RATIO = 1 / 24;
const MIN_BACKGROUND_RADIUS = 8;

/**
 * Prepares RGBA pixels for OCR in place: grayscale, divide out uneven lighting
 * (phone shadows), then stretch contrast so text ends up dark on white.
 * Tesseract binarizes with one global threshold, so a shadow across the page
 * otherwise wipes out the text on the darker side. Alpha is left untouched.
 */
export function enhanceForOcr(pixels: Uint8ClampedArray, width: number, height: number): void {
  const pixelCount = width * height;
  if (pixelCount === 0) return;

  const gray = new Float32Array(pixelCount);
  for (let p = 0; p < pixelCount; p++) {
    const i = p * 4;
    gray[p] = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
  }

  flattenBackground(gray, width, height);
  stretchContrast(gray);

  for (let p = 0; p < pixelCount; p++) {
    const i = p * 4;
    pixels[i] = gray[p];
    pixels[i + 1] = gray[p];
    pixels[i + 2] = gray[p];
  }
}

function flattenBackground(gray: Float32Array, width: number, height: number): void {
  const radius = Math.max(
    MIN_BACKGROUND_RADIUS,
    Math.round(Math.max(width, height) * BACKGROUND_RADIUS_RATIO),
  );

  // Summed-area table makes every box mean O(1).
  const stride = width + 1;
  const sums = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      rowSum += gray[y * width + x];
      sums[(y + 1) * stride + x + 1] = sums[y * stride + x + 1] + rowSum;
    }
  }

  const flattened = new Float32Array(gray.length);
  for (let y = 0; y < height; y++) {
    const top = Math.max(0, y - radius);
    const bottom = Math.min(height, y + radius + 1);
    for (let x = 0; x < width; x++) {
      const left = Math.max(0, x - radius);
      const right = Math.min(width, x + radius + 1);
      const area = (bottom - top) * (right - left);
      const sum =
        sums[bottom * stride + right] -
        sums[top * stride + right] -
        sums[bottom * stride + left] +
        sums[top * stride + left];
      const background = sum / area;
      const p = y * width + x;
      flattened[p] = background > 0 ? Math.min(255, (gray[p] / background) * 255) : 255;
    }
  }
  gray.set(flattened);
}

function stretchContrast(gray: Float32Array): void {
  const histogram = new Uint32Array(256);
  for (let p = 0; p < gray.length; p++) histogram[Math.round(gray[p])]++;

  const clipCount = Math.floor(gray.length * CLIP_RATIO);
  let low = 0;
  for (let seen = 0; low < 255; low++) {
    seen += histogram[low];
    if (seen > clipCount) break;
  }
  let high = 255;
  for (let seen = 0; high > 0; high--) {
    seen += histogram[high];
    if (seen > clipCount) break;
  }

  const spread = high - low;
  if (spread < MIN_SPREAD) return;
  for (let p = 0; p < gray.length; p++) {
    gray[p] = Math.min(255, Math.max(0, ((gray[p] - low) * 255) / spread));
  }
}
