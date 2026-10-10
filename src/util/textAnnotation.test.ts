import { describe, expect, it } from "vitest";
import { buildTextSegments } from "@/util/textAnnotation";

describe("buildTextSegments", () => {
  it("returns a single unstyled segment when there are no ranges", () => {
    expect(buildTextSegments("hello", [])).toEqual([{ text: "hello", style: null }]);
  });

  it("returns an empty array for empty text", () => {
    expect(buildTextSegments("", [{ start: 0, end: 1, style: "highlight" }])).toEqual([]);
  });

  it("splits around a single range in the middle", () => {
    expect(
      buildTextSegments("hello world", [{ start: 6, end: 11, style: "highlight" }]),
    ).toEqual([
      { text: "hello ", style: null },
      { text: "world", style: "highlight" },
    ]);
  });

  it("handles a range covering the whole text", () => {
    expect(buildTextSegments("abc", [{ start: 0, end: 3, style: "underline" }])).toEqual([
      { text: "abc", style: "underline" },
    ]);
  });

  it("lets a later overlapping range win", () => {
    expect(
      buildTextSegments("abcdef", [
        { start: 0, end: 4, style: "highlight" },
        { start: 2, end: 6, style: "underline" },
      ]),
    ).toEqual([
      { text: "ab", style: "highlight" },
      { text: "cdef", style: "underline" },
    ]);
  });

  it("clamps out-of-range start/end to the text bounds", () => {
    expect(buildTextSegments("abc", [{ start: -5, end: 100, style: "highlight" }])).toEqual([
      { text: "abc", style: "highlight" },
    ]);
  });

  it("produces an empty-style segment for a zero-length range", () => {
    expect(buildTextSegments("abc", [{ start: 1, end: 1, style: "highlight" }])).toEqual([
      { text: "abc", style: null },
    ]);
  });
});
