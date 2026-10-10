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
        className={`whitespace-pre-wrap text-sm text-ink ${editable ? "select-text" : ""}`}
      >
        {segments.map((segment, index) => {
          if (segment.style === "highlight") {
            return (
              // text-ink would go near-invisible here: --highlighter stays the
              // same light yellow in dark mode, but --ink flips to a light
              // color too. Pin the mark's text to the light-mode ink value so
              // it stays readable against the (theme-invariant) highlighter.
              <mark key={index} className="rounded bg-highlighter text-[#1e1b4b]">
                {segment.text}
              </mark>
            );
          }
          if (segment.style === "underline") {
            return (
              <span key={index} className="underline decoration-wrong decoration-2 underline-offset-2">
                {segment.text}
              </span>
            );
          }
          return <span key={index}>{segment.text}</span>;
        })}
      </p>
      {editable && (
        <div className="mt-2">
          <p className="text-xs text-muted">
            {pending ? "선택한 부분을 표시해 보세요." : "텍스트를 드래그해서 선택하면 표시할 수 있어요."}
          </p>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              disabled={!pending}
              onClick={() => applyStyle("highlight")}
              className="rounded-control border border-border bg-highlighter/40 px-3 py-1.5 text-xs font-medium text-[#1e1b4b] hover:bg-highlighter/60 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-highlighter/40"
            >
              형광펜
            </button>
            <button
              type="button"
              disabled={!pending}
              onClick={() => applyStyle("underline")}
              className="rounded-control border border-wrong px-3 py-1.5 text-xs font-medium text-wrong hover:bg-wrong/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              밑줄
            </button>
            {ranges.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="ml-auto rounded-control px-2 py-1 text-xs text-muted hover:text-wrong"
              >
                전체 지우기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
