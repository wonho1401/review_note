import Dexie, { type Table } from "dexie";
import type { Archive, Question } from "@/types/domain";

class ReviewNoteDB extends Dexie {
  archives!: Table<Archive, string>;
  questions!: Table<Question, string>;

  constructor() {
    super("review-note");
    this.version(1).stores({
      archives: "id, createdAt",
      questions: "id, archiveId, status, createdAt, [archiveId+status]",
    });
  }
}

export const db = new ReviewNoteDB();
