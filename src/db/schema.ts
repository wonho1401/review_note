import Dexie, { type Table } from "dexie";
import type { Archive, Question } from "@/types/domain";

// Safari/WebKit has a long-standing, recurring bug (recurs across iOS 11, 14.5,
// 16.4, 18...) where storing a Blob directly in IndexedDB throws
// "Error preparing Blob/File data to be stored in object store". Storing images
// as a plain ArrayBuffer + mime type instead sidesteps it. This is purely an
// internal storage detail: the public `Question` type (api/question.ts boundary)
// still exposes promptImage/answerImage as Blob, matching the domain model.
export interface StoredImage {
  buffer: ArrayBuffer;
  type: string;
}

export type StoredQuestion = Omit<Question, "promptImage" | "answerImage"> & {
  promptImage?: StoredImage;
  answerImage?: StoredImage;
};

class ReviewNoteDB extends Dexie {
  archives!: Table<Archive, string>;
  questions!: Table<StoredQuestion, string>;

  constructor() {
    super("review-note");
    this.version(1).stores({
      archives: "id, createdAt",
      questions: "id, archiveId, status, createdAt, [archiveId+status]",
    });
  }
}

export const db = new ReviewNoteDB();
