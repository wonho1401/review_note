import Dexie, { type Table } from "dexie";
import type { Archive, Question } from "@/types/domain";

// Safari/WebKit has a long-standing, recurring bug (recurs across iOS 11, 14.5,
// 16.4, 18...) where storing a Blob directly in IndexedDB throws
// "Error preparing Blob/File data to be stored in object store". Storing images
// as a plain ArrayBuffer + mime type instead sidesteps it. This is purely an
// internal storage detail: the public `Question` type (api/question.ts boundary)
// still exposes promptImages/answerImages as Blob[], matching the domain model.
export interface StoredImage {
  buffer: ArrayBuffer;
  type: string;
}

export type StoredQuestion = Omit<Question, "promptImages" | "answerImages"> & {
  promptImages: StoredImage[];
  answerImages: StoredImage[];
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
    // v2: OX questions hold several statements, each with its own answer.
    // Turn the old single `oxAnswer` into a one-item list.
    this.version(2)
      .stores({
        archives: "id, createdAt",
        questions: "id, archiveId, status, createdAt, [archiveId+status]",
      })
      .upgrade((tx) =>
        tx
          .table<StoredQuestion & { oxAnswer?: boolean }, string>("questions")
          .toCollection()
          .modify((q) => {
            if (q.oxAnswer !== undefined) {
              q.oxItems = [{ statement: "", answer: q.oxAnswer }];
            }
            delete q.oxAnswer;
          }),
      );
    // v3: a question can carry several photos. Turn the old single
    // `promptImage`/`answerImage` into lists, and drop the photo-annotation
    // entries left over from the removed image annotator.
    this.version(3)
      .stores({
        archives: "id, createdAt",
        questions: "id, archiveId, status, createdAt, [archiveId+status]",
      })
      .upgrade((tx) =>
        tx
          .table<
            StoredQuestion & {
              promptImage?: StoredImage;
              answerImage?: StoredImage;
              annotations: { target: string }[];
            },
            string
          >("questions")
          .toCollection()
          .modify((q) => {
            q.promptImages = q.promptImage ? [q.promptImage] : [];
            q.answerImages = q.answerImage ? [q.answerImage] : [];
            delete q.promptImage;
            delete q.answerImage;
            q.annotations = q.annotations.filter((a) => a.target === "text");
          }),
      );
  }
}

export const db = new ReviewNoteDB();
