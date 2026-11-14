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
  const items = [
    { statement: "ㄱ", answer: true },
    { statement: "ㄴ", answer: false },
    { statement: "ㄷ", answer: true },
  ];

  it("returns true for a single item answered correctly", () => {
    expect(gradeOx({ oxItems: [{ statement: "", answer: true }] }, [true])).toBe(true);
  });

  it("returns false for a single item answered wrong", () => {
    expect(gradeOx({ oxItems: [{ statement: "", answer: true }] }, [false])).toBe(false);
  });

  it("returns true only when every item matches", () => {
    expect(gradeOx({ oxItems: items }, [true, false, true])).toBe(true);
  });

  it("returns false when any one item is wrong", () => {
    expect(gradeOx({ oxItems: items }, [true, true, true])).toBe(false);
  });

  it("returns false when an item is left unanswered", () => {
    expect(gradeOx({ oxItems: items }, [true, false, null])).toBe(false);
    expect(gradeOx({ oxItems: items }, [true, false])).toBe(false);
  });

  it("returns false when there are no items", () => {
    expect(gradeOx({ oxItems: undefined }, [])).toBe(false);
    expect(gradeOx({ oxItems: [] }, [])).toBe(false);
  });
});
