interface RemoveButtonProps {
  label: string;
  onClick: () => void;
}

/** Small icon button for deleting one row (a choice, an OX item). */
export default function RemoveButton({ label, onClick }: RemoveButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-10 w-8 shrink-0 items-center justify-center rounded-[10px] text-muted hover:text-wrong"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
