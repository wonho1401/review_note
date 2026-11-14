import { describe, expect, it } from "vitest";
import { selectSessionQueue, summarizeSession } from "@/util/session";
import type { Question, Status } from "@/types/domain";

function makeQuestion(id: string, status: Status): Question {
  return {
    id,
    archiveId: "archive-1",
    type: "ox",
    oxItems: [{ statement: "", answer: true }],
    promptImages: [],
    answerImages: [],
    annotations: [],
    status,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe("selectSessionQueue", () => {
  const questions = [
    makeQuestion("q1", "unsolved"),
    makeQuestion("q2", "correct"),
    makeQuestion("q3", "wrong"),
  ];

  it("excludes correct questions when includeAll is false", () => {
    expect(selectSessionQueue(questions, false).map((q) => q.id)).toEqual(["q1", "q3"]);
  });

  it("includes every question when includeAll is true", () => {
    expect(selectSessionQueue(questions, true).map((q) => q.id)).toEqual(["q1", "q2", "q3"]);
  });

  it("returns an empty array when all questions are correct and includeAll is false", () => {
    const allCorrect = [makeQuestion("q1", "correct"), makeQuestion("q2", "correct")];
    expect(selectSessionQueue(allCorrect, false)).toEqual([]);
  });
});

describe("summarizeSession", () => {
  it("counts graded and correct results", () => {
    expect(
      summarizeSession([
        { questionId: "q1", result: "correct" },
        { questionId: "q2", result: "wrong" },
        { questionId: "q3", result: "correct" },
      ]),
    ).toEqual({ gradedCount: 3, correctCount: 2 });
  });

  it("returns zeroes for an empty result list", () => {
    expect(summarizeSession([])).toEqual({ gradedCount: 0, correctCount: 0 });
  });
});
