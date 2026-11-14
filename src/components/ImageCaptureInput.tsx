import { useRef, useState, type ChangeEvent } from "react";
import { resizeImageBlob } from "@/util/resizeImage";
import { recognizeText } from "@/util/ocr";
import BlobImage from "@/components/BlobImage";

// Keeps one question from ballooning local storage (and, in ver.1, the
// per-request upload size).
const MAX_IMAGES = 10;

const TILE =
  "flex h-19 w-19 flex-col items-center justify-center gap-1 rounded-control border-[1.5px] border-dashed border-border bg-surface text-xs font-bold text-brand hover:border-brand disabled:opacity-50";

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
  // Which photo (by position) is being read, and that photo's progress.
  const [ocrStep, setOcrStep] = useState<{ index: number; progress: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_IMAGES - images.length;
  const busy = adding || ocrStep !== null;

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

  async function handleRecognizeAll() {
    if (busy || images.length === 0) return;
    setMessage(null);
    const texts: string[] = [];
    try {
      for (let i = 0; i < images.length; i++) {
        setOcrStep({ index: i, progress: 0 });
        const text = await recognizeText(images[i], (progress) =>
          setOcrStep({ index: i, progress }),
        );
        if (text) texts.push(text);
      }
      if (texts.length === 0) {
        setMessage("사진에서 글자를 찾지 못했어요. 직접 입력해 주세요.");
        return;
      }
      onTextRecognized(texts.join("\n\n"));
    } catch {
      setMessage("글자 인식에 실패했어요. 다시 시도하거나 직접 입력해 주세요.");
    } finally {
      setOcrStep(null);
    }
  }

  function handleRemove(index: number) {
    onImagesChange(images.filter((_, i) => i !== index));
    setMessage(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-2.5">
        {images.map((image, index) => (
          // Blobs have no stable id. Index keys are safe: BlobImage rebuilds
          // its object URL whenever the blob at that index changes.
          <li key={index} className="relative">
            <BlobImage
              blob={image}
              alt={`${label} ${index + 1}`}
              className="h-19 w-19 rounded-control border border-border object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              disabled={busy}
              aria-label={`${label} ${index + 1} 삭제`}
              className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-ink text-surface disabled:opacity-50"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </li>
        ))}
        {remaining > 0 && (
          <>
            <li>
              <button
                type="button"
                disabled={busy}
                onClick={() => cameraInputRef.current?.click()}
                className={TILE}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
                촬영
              </button>
            </li>
            <li>
              <button
                type="button"
                disabled={busy}
                onClick={() => galleryInputRef.current?.click()}
                className={TILE}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                  <circle cx="9" cy="10" r="1.6" />
                  <path d="M21 16l-5-5-8 8" />
                </svg>
                앨범
              </button>
            </li>
          </>
        )}
      </ul>
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
        aria-label={`${label} 앨범에서 선택`}
        className="hidden"
        onChange={handleFilesSelected}
      />

      <div className="flex flex-wrap items-center gap-2">
        {images.length > 0 && (
          <button
            type="button"
            onClick={handleRecognizeAll}
            disabled={busy}
            className="flex h-9 items-center gap-1.5 rounded-[10px] bg-primary-soft px-3 text-[13px] font-bold text-brand disabled:opacity-60"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M8 9h8M8 12h8M8 15h5" />
            </svg>
            {ocrStep
              ? `글자 인식 중… ${images.length > 1 ? `${ocrStep.index + 1}/${images.length}장 ` : ""}${Math.round(ocrStep.progress * 100)}%`
              : "사진에서 글자 가져오기"}
          </button>
        )}
        {(adding || images.length > 0) && (
          <span className="text-xs text-muted">
            {adding ? "사진을 넣는 중…" : `${images.length}/${MAX_IMAGES}장`}
          </span>
        )}
      </div>

      {message && <p className="text-xs text-wrong">{message}</p>}
    </div>
  );
}
