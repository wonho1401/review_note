import { describe, expect, it } from "vitest";
import { enhanceForOcr } from "./enhanceForOcr";

/** Builds an RGBA image from a gray-level function of (x, y). */
function image(width: number, height: number, grayAt: (x: number, y: number) => number) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const g = grayAt(x, y);
      pixels.set([g, g, g, 255], i);
    }
  }
  return pixels;
}

function grayAt(pixels: Uint8ClampedArray, width: number, x: number, y: number): number {
  return pixels[(y * width + x) * 4];
}

// Sparse "ink" columns every 6px, like strokes of text.
const isInk = (x: number) => x % 6 === 0;

describe("enhanceForOcr", () => {
  it("turns faint text on gray paper into dark text on white", () => {
    const w = 60;
    const h = 20;
    const pixels = image(w, h, (x) => (isInk(x) ? 120 : 180));
    enhanceForOcr(pixels, w, h);
    expect(grayAt(pixels, w, 30, 10)).toBeLessThan(40); // ink
    expect(grayAt(pixels, w, 31, 10)).toBeGreaterThan(240); // paper
  });

  it("evens out a shadow so both sides end up alike", () => {
    // Left half in shadow (paper 90, ink 50); right half lit (paper 210, ink 120).
    // A single global threshold can't separate both halves: the shadowed
    // paper (90) is darker than the lit ink (120).
    const w = 240;
    const h = 40;
    const pixels = image(w, h, (x) => {
      const lit = x >= w / 2;
      if (isInk(x)) return lit ? 120 : 50;
      return lit ? 210 : 90;
    });
    enhanceForOcr(pixels, w, h);

    const shadowPaper = grayAt(pixels, w, 31, 20);
    const shadowInk = grayAt(pixels, w, 30, 20);
    const litPaper = grayAt(pixels, w, 211, 20);
    const litInk = grayAt(pixels, w, 210, 20);
    expect(shadowPaper).toBeGreaterThan(200);
    expect(litPaper).toBeGreaterThan(200);
    // Now one threshold separates ink from paper everywhere.
    expect(Math.max(shadowInk, litInk)).toBeLessThan(Math.min(shadowPaper, litPaper) - 80);
  });

  it("writes equal RGB channels", () => {
    const w = 20;
    const h = 20;
    const pixels = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < pixels.length; i += 4) pixels.set([200, 40 + (i % 50), 90, 255], i);
    enhanceForOcr(pixels, w, h);
    for (let i = 0; i < pixels.length; i += 4) {
      expect(pixels[i]).toBe(pixels[i + 1]);
      expect(pixels[i]).toBe(pixels[i + 2]);
    }
  });

  it("leaves alpha untouched", () => {
    const w = 10;
    const h = 10;
    const pixels = image(w, h, (x) => (isInk(x) ? 30 : 220));
    pixels[3] = 77;
    pixels[7] = 3;
    enhanceForOcr(pixels, w, h);
    expect(pixels[3]).toBe(77);
    expect(pixels[7]).toBe(3);
  });

  it("keeps a blank page blank instead of amplifying noise", () => {
    const w = 30;
    const h = 30;
    const pixels = image(w, h, (x, y) => ((x + y) % 2 ? 200 : 204));
    enhanceForOcr(pixels, w, h);
    for (let i = 0; i < pixels.length; i += 4) {
      expect(pixels[i]).toBeGreaterThan(240);
    }
  });

  it("handles an empty image", () => {
    expect(() => enhanceForOcr(new Uint8ClampedArray(0), 0, 0)).not.toThrow();
  });
});
