import { useRef, useState, type ChangeEvent } from "react";
import { resizeImageBlob } from "@/util/resizeImage";
import { recognizeText } from "@/util/ocr";
import BlobImage from "@/components/BlobImage";

// Keeps one question from ballooning local storage (and, in ver.1, the
// per-request upload size).
const MAX_IMAGES = 10;

interface ImageCaptureInputProps {
  images: Blob[];
  onImagesChange: (images: Blob[]) => void;
  onTextRecognized: (text: string) => void;
  label: string;
}

export default function ImageCaptureInput({
  images,
  onImagesChange,
  onTextRecognized,
  label,
}: ImageCaptureInputProps) {
  const [recognizingIndex, setRecognizingIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_IMAGES - images.length;

  async function handleFilesSelected(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setMessage(null);
    const accepted = files.slice(0, remaining);
    if (accepted.length < files.length) {
      setMessage(`사진은 최대 ${MAX_IMAGES}장까지 넣을 수 있어요.`);
    }
    if (accepted.length === 0) return;
    setAdding(true);
    try {
      const resized: Blob[] = [];
      for (const file of accepted) {
        resized.push(await resizeImageBlob(file));
      }
      onImagesChange([...images, ...resized]);
    } finally {
      setAdding(false);
    }
  }

  async function handleRecognize(index: number) {
    if (recognizingIndex !== null) return;
    setRecognizingIndex(index);
    setProgress(0);
    setMessage(null);
    try {
      const text = await recognizeText(images[index], setProgress);
      if (!text) {
        setMessage("이미지에서 텍스트를 찾지 못했어요. 직접 입력해 주세요.");
        return;
      }
      onTextRecognized(text);
    } catch {
      setMessage("텍스트 인식에 실패했어요. 다시 시도하거나 직접 입력해 주세요.");
    } finally {
      setRecognizingIndex(null);
    }
  }

  function handleRemove(index: number) {
    onImagesChange(images.filter((_, i) => i !== index));
    setMessage(null);
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={remaining <= 0 || adding}
          onClick={() => cameraInputRef.current?.click()}
          className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink hover:border-primary disabled:opacity-50"
        >
          촬영
        </button>
        <button
          type="button"
          disabled={remaining <= 0 || adding}
          onClick={() => galleryInputRef.current?.click()}
          className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink hover:border-primary disabled:opacity-50"
        >
          갤러리에서 선택
        </button>
        <span className="text-xs text-muted">
          {adding ? "사진을 넣는 중…" : `${images.length}/${MAX_IMAGES}장`}
        </span>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          aria-label={`${label} 촬영`}
          className="hidden"
          onChange={handleFilesSelected}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          aria-label={`${label} 갤러리에서 선택`}
          className="hidden"
          onChange={handleFilesSelected}
        />
      </div>

      {images.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {images.map((image, index) => (
            // Blobs have no stable id. Index keys are safe: BlobImage rebuilds
            // its object URL whenever the blob at that index changes.
            <li key={index} className="flex w-28 flex-col gap-1">
              <BlobImage
                blob={image}
                alt={`${label} ${index + 1}`}
                className="h-28 w-28 rounded-control border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => handleRecognize(index)}
                disabled={recognizingIndex !== null}
                className="rounded-control border border-primary px-2 py-1 text-xs text-primary hover:bg-primary hover:text-white disabled:opacity-60"
              >
                {recognizingIndex === index
                  ? `인식 중… ${Math.round(progress * 100)}%`
                  : "텍스트 인식"}
              </button>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                aria-label={`${label} ${index + 1} 삭제`}
                className="rounded-control px-2 py-1 text-xs text-wrong hover:underline"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}

      {message && <p className="text-xs text-wrong">{message}</p>}
    </div>
  );
}
