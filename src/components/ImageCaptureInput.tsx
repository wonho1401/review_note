import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { resizeImageBlob } from "@/util/resizeImage";
import { recognizeText } from "@/util/ocr";

interface ImageCaptureInputProps {
  image: Blob | undefined;
  onImageChange: (image: Blob | undefined) => void;
  onTextRecognized: (text: string) => void;
  label: string;
}

export default function ImageCaptureInput({
  image,
  onImageChange,
  onTextRecognized,
  label,
}: ImageCaptureInputProps) {
  const [recognizing, setRecognizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setOcrError(null);
    const resized = await resizeImageBlob(file);
    onImageChange(resized);
  }

  async function handleRecognize() {
    if (!image || recognizing) return;
    setRecognizing(true);
    setProgress(0);
    setOcrError(null);
    try {
      const text = await recognizeText(image, setProgress);
      if (!text) {
        setOcrError("이미지에서 텍스트를 찾지 못했어요. 직접 입력해 주세요.");
        return;
      }
      onTextRecognized(text);
    } catch {
      setOcrError("텍스트 인식에 실패했어요. 다시 시도하거나 직접 입력해 주세요.");
    } finally {
      setRecognizing(false);
    }
  }

  function handleRemove() {
    onImageChange(undefined);
    setOcrError(null);
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink hover:border-primary"
        >
          촬영
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink hover:border-primary"
        >
          갤러리에서 선택
        </button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          aria-label={`${label} 촬영`}
          className="hidden"
          onChange={handleFileSelected}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          aria-label={`${label} 갤러리에서 선택`}
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>

      {previewUrl && (
        <div className="flex items-start gap-3">
          <img
            src={previewUrl}
            alt={`${label} 미리보기`}
            className="h-28 w-28 rounded-control border border-border object-cover"
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleRecognize}
              disabled={recognizing}
              className="rounded-control border border-primary px-3 py-1.5 text-xs text-primary hover:bg-primary hover:text-white disabled:opacity-60"
            >
              {recognizing ? `텍스트 인식 중… ${Math.round(progress * 100)}%` : "텍스트 인식"}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-control px-3 py-1.5 text-xs text-wrong hover:underline"
            >
              사진 삭제
            </button>
          </div>
        </div>
      )}

      {ocrError && <p className="text-xs text-wrong">{ocrError}</p>}
    </div>
  );
}
