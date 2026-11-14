export type QuestionType = "mcq" | "essay" | "ox";
export type Status = "unsolved" | "correct" | "wrong";

export interface Archive {
  id: string;
  name: string;
  createdAt: number;
  lastStudiedAt?: number; // 마지막으로 채점한 시각 (홈 "이어서 복습"용)
}

/** 노트 하나의 문제 상태별 개수 */
export interface ArchiveProgress {
  total: number;
  correct: number;
  wrong: number;
}

export type Annotation = {
  target: "text";
  field: "answerText";
  start: number;
  end: number; // 문자 offset
  style: "highlight" | "underline";
};

export interface OxItem {
  statement: string; // 항목 지문 (사진 문제면 비워둘 수 있음)
  answer: boolean; // 정답 O = true
}

export interface Question {
  id: string;
  archiveId: string;
  type: QuestionType;

  promptText?: string; // 문제(글)
  promptImages: Blob[]; // 문제(사진 원본, 여러 장)
  answerText?: string; // 정답(글)
  answerImages: Blob[]; // 정답(사진 원본, 여러 장)

  choices?: string[]; // mcq 보기
  correctChoice?: number; // mcq 정답 index
  oxItems?: OxItem[]; // ox 항목들 — 전부 맞아야 정답
  explanation?: string; // 해설 (선택, 모든 유형)

  annotations: Annotation[];
  status: Status;
  lastResult?: "correct" | "wrong";
  createdAt: number;
  updatedAt: number;
}
