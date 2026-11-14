import type { Question } from "@/types/domain";

export function gradeMcq(
  question: Pick<Question, "correctChoice">,
  selectedChoice: number,
): boolean {
  return question.correctChoice !== undefined && selectedChoice === question.correctChoice;
}

/** Correct only when every item is answered and matches its answer. */
export function gradeOx(
  question: Pick<Question, "oxItems">,
  selectedAnswers: readonly (boolean | null)[],
): boolean {
  const items = question.oxItems ?? [];
  return (
    items.length > 0 &&
    selectedAnswers.length === items.length &&
    items.every((item, i) => selectedAnswers[i] === item.answer)
  );
}
