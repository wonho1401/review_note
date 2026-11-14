import { describe, expect, it } from "vitest";
import { summarizeHome } from "@/util/homeSummary";
import type { Archive } from "@/types/domain";

function archive(id: string, createdAt: number, lastStudiedAt?: number): Archive {
  return { id, name: id, createdAt, lastStudiedAt };
}

describe("summarizeHome", () => {
  it("adds up counts across archives", () => {
    const summary = summarizeHome([archive("a", 1), archive("b", 2)], {
      a: { total: 5, correct: 2, wrong: 2 },
      b: { total: 3, correct: 1, wrong: 0 },
    });
    expect(summary.remaining).toBe(5);
    expect(summary.correct).toBe(3);
  });

  it("computes accuracy over graded questions only", () => {
    const summary = summarizeHome([archive("a", 1)], { a: { total: 10, correct: 3, wrong: 1 } });
    expect(summary.accuracy).toBe(0.75);
  });

  it("has no accuracy before anything is graded", () => {
    const summary = summarizeHome([archive("a", 1)], { a: { total: 4, correct: 0, wrong: 0 } });
    expect(summary.accuracy).toBeNull();
  });

  it("suggests the most recently studied archive with questions left", () => {
    const summary = summarizeHome(
      [archive("old", 1, 100), archive("recent", 2, 200), archive("done", 3, 300)],
      {
        old: { total: 2, correct: 0, wrong: 1 },
        recent: { total: 2, correct: 1, wrong: 1 },
        done: { total: 2, correct: 2, wrong: 0 },
      },
    );
    expect(summary.continueArchive?.id).toBe("recent");
  });

  it("falls back to the oldest never-studied archive", () => {
    const summary = summarizeHome([archive("second", 2), archive("first", 1)], {
      first: { total: 1, correct: 0, wrong: 0 },
      second: { total: 1, correct: 0, wrong: 0 },
    });
    expect(summary.continueArchive?.id).toBe("first");
  });

  it("suggests nothing when every question is correct or there are none", () => {
    const summary = summarizeHome([archive("a", 1), archive("empty", 2)], {
      a: { total: 2, correct: 2, wrong: 0 },
    });
    expect(summary.continueArchive).toBeNull();
    expect(summary.remaining).toBe(0);
  });
});
