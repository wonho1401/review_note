import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getArchive } from "@/api/archive";
import { listQuestionsByArchive } from "@/api/question";
import { QUESTION_TYPE_LABEL } from "@/constants/questionType";
import type { Archive, Question } from "@/types/domain";

function previewText(question: Question): string {
  const text = question.promptText?.trim();
  if (text) {
    return text.length > 40 ? `${text.slice(0, 40)}…` : text;
  }
  if (question.promptImage) return "(사진 문제)";
  return "(내용 없음)";
}

function statusLabel(status: Question["status"]): string {
  if (status === "correct") return "맞힘";
  if (status === "wrong") return "틀림";
  return "안 풀었어요";
}

function statusDotClass(status: Question["status"]): string {
  if (status === "correct") return "bg-correct";
  if (status === "wrong") return "bg-wrong";
  return "bg-muted";
}

export default function ArchiveDetailPage() {
  const { archiveId } = useParams();
  const [archive, setArchive] = useState<Archive | null | undefined>(undefined);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (!archiveId) return;
    let cancelled = false;
    Promise.all([getArchive(archiveId), listQuestionsByArchive(archiveId)]).then(
      ([a, qs]) => {
        if (cancelled) return;
        setArchive(a ?? null);
        setQuestions(qs);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [archiveId]);

  if (archive === undefined) {
    return (
      <main className="p-6">
        <p className="text-sm text-muted">불러오는 중…</p>
      </main>
    );
  }

  if (archive === null) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold text-ink">아카이브를 찾을 수 없습니다</h1>
        <Link to="/" className="mt-4 inline-block text-primary">
          홈으로
        </Link>
      </main>
    );
  }

  const total = questions.length;
  const correctCount = questions.filter((q) => q.status === "correct").length;
  const remaining = total - correctCount;

  return (
    <main className="p-6">
      <Link to="/" className="text-sm text-primary">
        홈으로
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-ink">{archive.name}</h1>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-card border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-semibold text-ink">{total}</p>
          <p className="text-xs text-muted">전체</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-semibold text-ink">{remaining}</p>
          <p className="text-xs text-muted">남은</p>
        </div>
        <div className="rounded-card border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-semibold text-correct">{correctCount}</p>
          <p className="text-xs text-muted">맞힘</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          to={`/archives/${archiveId}/solve`}
          className="shrink-0 whitespace-nowrap rounded-control bg-primary px-4 py-2 text-center text-sm font-medium text-white hover:bg-primary-hover"
        >
          풀이 시작
        </Link>
        <Link
          to={`/archives/${archiveId}/questions/new`}
          className="shrink-0 whitespace-nowrap rounded-control border border-border bg-surface px-4 py-2 text-center text-sm font-medium text-ink hover:border-primary"
        >
          문제 추가
        </Link>
      </div>

      {questions.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          아직 추가한 문제가 없어요. 첫 문제를 추가해 보세요.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {questions.map((question) => (
            <li key={question.id}>
              <Link
                to={`/archives/${archiveId}/questions/${question.id}/edit`}
                className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 hover:border-primary"
              >
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClass(question.status)}`}
                />
                <span className="sr-only">{statusLabel(question.status)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{previewText(question)}</p>
                  <p className="text-xs text-muted">{QUESTION_TYPE_LABEL[question.type]}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
