import { useState, type SubmitEvent } from "react";
import BottomSheet from "@/components/BottomSheet";

interface NameSheetProps {
  open: boolean;
  title: string;
  submitLabel: string;
  initialValue?: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}

export default function NameSheet({
  open,
  title,
  submitLabel,
  initialValue = "",
  onSubmit,
  onClose,
}: NameSheetProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("이름을 입력해 주세요");
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="예: 한국사 능력검정"
          aria-label="노트 이름"
          className="h-12 rounded-control border border-border bg-surface-sunken px-4 text-base text-ink placeholder:text-muted"
        />
        {error && <p className="text-sm text-wrong">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-control border border-border bg-surface text-base font-bold text-ink"
          >
            취소
          </button>
          <button
            type="submit"
            className="h-12 flex-[2] rounded-control bg-primary text-base font-bold text-white hover:bg-primary-hover"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
