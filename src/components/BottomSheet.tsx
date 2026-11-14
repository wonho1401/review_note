import { useEffect, useId, useRef, type ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * A native <dialog> pinned to the bottom of the screen. showModal() gives the
 * focus trap, Escape-to-close and inert background for free.
 */
export default function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      // A click on the dialog element itself (not its content) is a click on
      // the backdrop area.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-x-0 bottom-0 top-auto mx-auto mb-0 max-h-[85svh] w-full max-w-[560px] rounded-t-sheet border-0 bg-surface p-0 text-ink"
    >
      <div className="flex flex-col gap-4 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
        <span aria-hidden="true" className="mx-auto h-1.5 w-10 rounded-full bg-border" />
        <h2 id={titleId} className="text-lg font-extrabold">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
