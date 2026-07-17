export type QuestionType = "mcq" | "essay" | "ox";
export type Status = "unsolved" | "correct" | "wrong";

export interface Archive {
  id: string;
  name: string;
  createdAt: number;
}

export type Annotation =
  | {
      target: "text";
      field: "answerText";
      start: number;
      end: number; // 문자 offset
      style: "highlight" | "underline";
    }
  | {
      target: "image";
      field: "promptImage" | "answerImage";
      paths: { d: string; style: "highlight" | "underline" }[];
    }; // SVG path

export interface Question {
  id: string;
  archiveId: string;
  type: QuestionType;

  promptText?: string; // 문제(글)
  promptImage?: Blob; // 문제(사진 원본)
  answerText?: string; // 정답(글)
  answerImage?: Blob; // 정답(사진 원본)

  choices?: string[]; // mcq 보기
  correctChoice?: number; // mcq 정답 index
  oxAnswer?: boolean; // ox 정답

  annotations: Annotation[];
  status: Status;
  lastResult?: "correct" | "wrong";
  createdAt: number;
  updatedAt: number;
}
