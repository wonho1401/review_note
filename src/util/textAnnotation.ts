export type HighlightStyle = "highlight" | "underline";

export interface TextRange {
  start: number;
  end: number;
  style: HighlightStyle;
}

export interface TextSegment {
  text: string;
  style: HighlightStyle | null;
}

export function buildTextSegments(text: string, ranges: TextRange[]): TextSegment[] {
  if (text.length === 0) return [];

  const styles: (HighlightStyle | null)[] = new Array(text.length).fill(null);
  for (const range of ranges) {
    const start = Math.max(0, Math.min(range.start, text.length));
    const end = Math.max(start, Math.min(range.end, text.length));
    for (let i = start; i < end; i++) {
      styles[i] = range.style;
    }
  }

  const segments: TextSegment[] = [];
  let i = 0;
  while (i < text.length) {
    let j = i + 1;
    while (j < text.length && styles[j] === styles[i]) j++;
    segments.push({ text: text.slice(i, j), style: styles[i] });
    i = j;
  }
  return segments;
}
