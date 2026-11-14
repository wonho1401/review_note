import { useEffect, useRef, useState } from "react";
import { buildTextSegments, type HighlightStyle, type TextRange } from "@/util/textAnnotation";

interface HighlightableTextProps {
  text: string;
  ranges: TextRange[];
  editable: boolean;
  onAddAnnotation: (start: number, end: number, style: HighlightStyle) => void;
  onClearAll: () => void;
}

interface PendingSelection {
  start: number;
  end: number;
}

function getOffsetsWithinElement(
  container: HTMLElement,
  range: Range,
): { start: number; end: number } {
  const preStartRange = document.createRange();
  preStartRange.selectNodeContents(container);
  preStartRange.setEnd(range.startContainer, range.startOffset);
  const start = preStartRange.toString().length;
  const end = start + range.toString().length;
  return { start, end };
}

export default function HighlightableText({
  text,
  ranges,
  editable,
  onAddAnnotation,
  onClearAll,
}: HighlightableTextProps) {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const [pending, setPending] = useState<PendingSelection | null>(null);

  useEffect(() => {
    if (!editable) return;

    function handleSelectionChange() {
      const container = containerRef.current;
      const selection = window.getSelection();
      if (!container || !selection || selection.isCollapsed || selection.rangeCount === 0) {
        setPending(null);
        return;
      }
      const range = selection.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        setPending(null);
        return;
      }
      const { start, end } = getOffsetsWithinElement(container, range);
      if (end <= start) {
        setPending(null);
        return;
      }
      setPending({ start, end });
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [editable]);

  function applyStyle(style: HighlightStyle) {
    if (!pending) return;
    onAddAnnotation(pending.start, pending.end, style);
    setPending(null);
    window.getSelection()?.removeAllRanges();
  }

  const segments = buildTextSegments(text, ranges);

  return (
    <div>
      <p
        ref={containerRef}
        className={`whitespace-pre-wrap text-[15px] leading-[1.8] text-ink ${editable ? "select-text" : ""}`}
      >
        {segments.map((segment, index) => {
          if (segment.style === "highlight") {
            return (
              // text-ink would go near-invisible here: --highlighter stays the
              // same light yellow in dark mode, but --ink flips to a light
              // color too. Pin the mark's text to the light-mode ink value so
              // it stays readable against the (theme-invariant) highlighter.
              <mark key={index} className="rounded bg-highlighter px-0.5 text-[#17153b]">
                {segment.text}
              </mark>
            );
          }
          if (segment.style === "underline") {
            return (
              <span key={index} className="underline decoration-underline decoration-2 underline-offset-[3px]">
                {segment.text}
              </span>
            );
          }
          return <span key={index}>{segment.text}</span>;
        })}
      </p>
      {editable && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-muted">
            {pending ? "선택한 부분을 표시해 보세요" : "글자를 드래그해서 선택해 보세요"}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!pending}
              onClick={() => applyStyle("highlight")}
              className="h-9 rounded-[10px] bg-highlighter px-3 text-xs font-bold text-[#17153b] disabled:cursor-not-allowed disabled:opacity-40"
            >
              형광펜
            </button>
            <button
              type="button"
              disabled={!pending}
              onClick={() => applyStyle("underline")}
              className="h-9 rounded-[10px] border border-border bg-surface px-3 text-xs font-bold text-ink underline decoration-underline decoration-2 underline-offset-[3px] disabled:cursor-not-allowed disabled:opacity-40"
            >
              밑줄
            </button>
            {ranges.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                aria-label="표시 모두 지우기"
                className="ml-auto flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-surface text-muted hover:text-wrong"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
