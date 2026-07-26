import { createWorker } from "tesseract.js";

export async function recognizeText(
  image: Blob,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const worker = await createWorker(["kor", "eng"], undefined, {
    logger: (m) => {
      if (m.status === "recognizing text") {
        onProgress?.(m.progress);
      }
    },
  });
  try {
    const { data } = await worker.recognize(image);
    return cleanOcrText(data.text);
  } finally {
    await worker.terminate();
  }
}

function cleanOcrText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
