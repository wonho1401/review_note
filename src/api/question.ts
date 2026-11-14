import { db, type StoredImage, type StoredQuestion } from "@/db/schema";
import { createId } from "@/util/id";
import type { ArchiveProgress, Question } from "@/types/domain";

async function toStoredImages(blobs: Blob[]): Promise<StoredImage[]> {
  return Promise.all(
    blobs.map(async (blob) => ({ buffer: await blob.arrayBuffer(), type: blob.type })),
  );
}

function fromStoredImages(stored: StoredImage[] | undefined): Blob[] {
  return (stored ?? []).map((image) => new Blob([image.buffer], { type: image.type }));
}

async function toStoredQuestion(question: Question): Promise<StoredQuestion> {
  return {
    ...question,
    promptImages: await toStoredImages(question.promptImages),
    answerImages: await toStoredImages(question.answerImages),
  };
}

function fromStoredQuestion(stored: StoredQuestion): Question {
  return {
    ...stored,
    promptImages: fromStoredImages(stored.promptImages),
    answerImages: fromStoredImages(stored.answerImages),
  };
}

export async function listQuestionsByArchive(archiveId: string): Promise<Question[]> {
  // Oldest first, so lists and solve sessions keep the order questions were added.
  const stored = await db.questions.where("archiveId").equals(archiveId).sortBy("createdAt");
  return stored.map(fromStoredQuestion);
}

/**
 * Per-archive status counts. Reads only the [archiveId+status] index keys, so
 * no question records (and none of their photos) are loaded.
 */
export async function countQuestionsByArchive(): Promise<Record<string, ArchiveProgress>> {
  const keys = await db.questions.orderBy("[archiveId+status]").keys();
  const progress: Record<string, ArchiveProgress> = {};
  for (const key of keys) {
    if (!Array.isArray(key)) continue;
    const [archiveId, status]: unknown[] = key;
    if (typeof archiveId !== "string") continue;
    const entry = (progress[archiveId] ??= { total: 0, correct: 0, wrong: 0 });
    entry.total++;
    if (status === "correct") entry.correct++;
    if (status === "wrong") entry.wrong++;
  }
  return progress;
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
  const { promptImages, answerImages, ...rest } = changes;
  const storedChanges: Partial<StoredQuestion> = {
    ...rest,
    updatedAt: Date.now(),
  };
  if (promptImages) {
    storedChanges.promptImages = await toStoredImages(promptImages);
  }
  if (answerImages) {
    storedChanges.answerImages = await toStoredImages(answerImages);
  }
  await db.questions.update(id, storedChanges);
}

export async function deleteQuestion(id: string): Promise<void> {
  await db.questions.delete(id);
}
