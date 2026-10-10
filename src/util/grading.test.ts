import { describe, expect, it } from "vitest";
import { gradeMcq, gradeOx } from "@/util/grading";

describe("gradeMcq", () => {
  it("returns true when the selected choice matches correctChoice", () => {
    expect(gradeMcq({ correctChoice: 1 }, 1)).toBe(true);
  });

  it("returns false when the selected choice differs from correctChoice", () => {
    expect(gradeMcq({ correctChoice: 1 }, 0)).toBe(false);
  });

  it("returns false when correctChoice is undefined", () => {
    expect(gradeMcq({ correctChoice: undefined }, 0)).toBe(false);
  });
});

describe("gradeOx", () => {
  it("returns true when the selected answer matches oxAnswer", () => {
    expect(gradeOx({ oxAnswer: true }, true)).toBe(true);
  });

  it("returns false when the selected answer differs from oxAnswer", () => {
    expect(gradeOx({ oxAnswer: true }, false)).toBe(false);
  });

  it("returns false when oxAnswer is undefined", () => {
    expect(gradeOx({ oxAnswer: undefined }, false)).toBe(false);
  });
});
