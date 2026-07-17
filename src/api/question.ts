import { db } from "@/db/schema";
import { createId } from "@/util/id";
import type { Question } from "@/types/domain";

export function listQuestionsByArchive(archiveId: string): Promise<Question[]> {
  return db.questions.where("archiveId").equals(archiveId).toArray();
}

export function getQuestion(id: string): Promise<Question | undefined> {
  return db.questions.get(id);
}

export type NewQuestionInput = Omit<
  Question,
  "id" | "annotations" | "status" | "createdAt" | "updatedAt"
>;

export async function createQuestion(input: NewQuestionInput): Promise<Question> {
  const now = Date.now();
  const question: Question = {
    ...input,
    id: createId(),
    annotations: [],
    status: "unsolved",
    createdAt: now,
    updatedAt: now,
  };
  await db.questions.add(question);
  return question;
}

export async function updateQuestion(
  id: string,
  changes: Partial<Omit<Question, "id" | "archiveId" | "createdAt">>,
): Promise<void> {
  await db.questions.update(id, { ...changes, updatedAt: Date.now() });
}

export async function deleteQuestion(id: string): Promise<void> {
  await db.questions.delete(id);
}
