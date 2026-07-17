import type { QuestionType } from "@/types/domain";

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  mcq: "객관식",
  essay: "서술형",
  ox: "OX",
};
