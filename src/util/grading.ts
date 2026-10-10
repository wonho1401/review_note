import type { Question } from "@/types/domain";

export function gradeMcq(
  question: Pick<Question, "correctChoice">,
  selectedChoice: number,
): boolean {
  return question.correctChoice !== undefined && selectedChoice === question.correctChoice;
}

export function gradeOx(
  question: Pick<Question, "oxAnswer">,
  selectedAnswer: boolean,
): boolean {
  return question.oxAnswer !== undefined && selectedAnswer === question.oxAnswer;
}
