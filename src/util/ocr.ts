import { createWorker, PSM } from "tesseract.js";
import { prepareOcrImage } from "@/util/prepareOcrImage";

export async function recognizeText(
  image: Blob,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const prepared = await prepareOcrImage(image);
  const worker = await createWorker(["kor", "eng"], undefined, {
    logger: (m) => {
      if (m.status === "recognizing text") {
        onProgress?.(m.progress);
      }
    },
  });
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      preserve_interword_spaces: "1",
    });
    const { data } = await worker.recognize(prepared);
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
