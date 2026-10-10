import type { Question } from "@/types/domain";

export interface SessionResult {
  questionId: string;
  result: "correct" | "wrong";
}

export function selectSessionQueue(questions: Question[], includeAll: boolean): Question[] {
  return includeAll ? questions : questions.filter((q) => q.status !== "correct");
}

export function summarizeSession(results: SessionResult[]): {
  gradedCount: number;
  correctCount: number;
} {
  return {
    gradedCount: results.length,
    correctCount: results.filter((r) => r.result === "correct").length,
  };
}
