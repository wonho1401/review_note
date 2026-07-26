import { db, type StoredImage, type StoredQuestion } from "@/db/schema";
import { createId } from "@/util/id";
import type { Question } from "@/types/domain";

async function toStoredImage(blob: Blob | undefined): Promise<StoredImage | undefined> {
  if (!blob) return undefined;
  return { buffer: await blob.arrayBuffer(), type: blob.type };
}

function fromStoredImage(stored: StoredImage | undefined): Blob | undefined {
  if (!stored) return undefined;
  return new Blob([stored.buffer], { type: stored.type });
}

async function toStoredQuestion(question: Question): Promise<StoredQuestion> {
  return {
    ...question,
    promptImage: await toStoredImage(question.promptImage),
    answerImage: await toStoredImage(question.answerImage),
  };
}

function fromStoredQuestion(stored: StoredQuestion): Question {
  return {
    ...stored,
    promptImage: fromStoredImage(stored.promptImage),
    answerImage: fromStoredImage(stored.answerImage),
  };
}

export async function listQuestionsByArchive(archiveId: string): Promise<Question[]> {
  const stored = await db.questions.where("archiveId").equals(archiveId).toArray();
  return stored.map(fromStoredQuestion);
}

export async function getQuestion(id: string): Promise<Question | undefined> {
  const stored = await db.questions.get(id);
  return stored ? fromStoredQuestion(stored) : undefined;
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
  await db.questions.add(await toStoredQuestion(question));
  return question;
}

export async function updateQuestion(
  id: string,
  changes: Partial<Omit<Question, "id" | "archiveId" | "createdAt">>,
): Promise<void> {
  const { promptImage, answerImage, ...rest } = changes;
  const storedChanges: Partial<StoredQuestion> = {
    ...rest,
    updatedAt: Date.now(),
  };
  if ("promptImage" in changes) {
    storedChanges.promptImage = await toStoredImage(promptImage);
  }
  if ("answerImage" in changes) {
    storedChanges.answerImage = await toStoredImage(answerImage);
  }
  await db.questions.update(id, storedChanges);
}

export async function deleteQuestion(id: string): Promise<void> {
  await db.questions.delete(id);
}
