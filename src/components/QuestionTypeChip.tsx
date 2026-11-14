import { QUESTION_TYPE_LABEL } from "@/constants/questionType";
import type { Question } from "@/types/domain";

function chipClass(type: Question["type"]): string {
  switch (type) {
    case "mcq":
      return "bg-primary-soft text-brand";
    case "ox":
      return "bg-amber-soft text-amber";
    case "essay":
      return "bg-teal-soft text-teal";
  }
}

interface QuestionTypeChipProps {
  question: Pick<Question, "type" | "oxItems">;
}

export default function QuestionTypeChip({ question }: QuestionTypeChipProps) {
  const itemCount = question.type === "ox" ? (question.oxItems?.length ?? 0) : 0;
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-bold ${chipClass(question.type)}`}
    >
      {QUESTION_TYPE_LABEL[question.type]}
      {itemCount > 1 && ` · ${itemCount}항목`}
    </span>
  );
}
