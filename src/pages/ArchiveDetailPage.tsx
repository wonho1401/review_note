import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { deleteArchive, getArchive, updateArchive } from "@/api/archive";
import { listQuestionsByArchive } from "@/api/question";
import BlobThumb from "@/components/BlobThumb";
import BottomSheet from "@/components/BottomSheet";
import NameSheet from "@/components/NameSheet";
import PageHeader from "@/components/PageHeader";
import ProgressRing from "@/components/ProgressRing";
import QuestionTypeChip from "@/components/QuestionTypeChip";
import StatusChip from "@/components/StatusChip";
import type { Archive, Question } from "@/types/domain";

type StatusFilter = "all" | "remaining" | "correct";

function filterQuestions(questions: Question[], filter: StatusFilter): Question[] {
  if (filter === "remaining") return questions.filter((q) => q.status !== "correct");
  if (filter === "correct") return questions.filter((q) => q.status === "correct");
  return questions;
}

function previewText(question: Question): string {
  const text = question.promptText?.trim();
  if (text) return text;
  if (question.promptImages.length > 0) return "사진 문제";
  return "(내용 없음)";
}

export default function ArchiveDetailPage() {
  const { archiveId } = useParams();
  const navigate = useNavigate();
  const [archive, setArchive] = useState<Archive | null | undefined>(undefined);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);

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

  async function handleRename(name: string) {
    if (!archive) return;
    await updateArchive(archive.id, { name });
    setArchive({ ...archive, name });
    setRenaming(false);
  }

  async function handleDelete() {
    if (!archive) return;
    const ok = window.confirm(
      `"${archive.name}" 노트를 삭제할까요? 안에 있는 문제도 모두 삭제돼요.`,
    );
    if (!ok) return;
    await deleteArchive(archive.id);
    navigate("/");
  }

  if (archive === undefined) {
    return (
      <main className="p-6">
        <p className="text-sm text-muted">불러오는 중…</p>
      </main>
    );
  }

  if (archive === null) {
    return (
      <main>
        <PageHeader backTo="/" title="노트를 찾을 수 없어요" />
      </main>
    );
  }

  const total = questions.length;
  const correctCount = questions.filter((q) => q.status === "correct").length;
  const remaining = total - correctCount;
  const visibleQuestions = filterQuestions(questions, filter);
  const ratio = total > 0 ? correctCount / total : 0;
  const filters: { value: StatusFilter; label: string; count: number }[] = [
    { value: "all", label: "전체", count: total },
    { value: "remaining", label: "남은", count: remaining },
    { value: "correct", label: "맞힘", count: correctCount },
  ];

  return (
    <main className="flex min-h-svh flex-col">
      <PageHeader
        backTo="/"
        backLabel="홈으로"
        actions={
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="노트 메뉴"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-border bg-surface text-ink hover:border-brand"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="19" cy="12" r="1.8" />
            </svg>
          </button>
        }
      />

      <div className="flex-1 px-5 pb-6">
        <div className="mt-2 flex items-center gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h1 className="break-keep text-[26px] font-extrabold leading-tight tracking-tight text-ink">
              {archive.name}
            </h1>
            <span className="text-sm text-muted">문제 {total}개</span>
          </div>
          {total > 0 && (
            <ProgressRing
              value={ratio}
              size={76}
              strokeWidth={9}
              label={`${Math.round(ratio * 100)}%`}
              sublabel={`${correctCount}/${total}`}
              ariaLabel={`맞힘 ${correctCount}/${total}`}
              tone={remaining === 0 ? "correct" : "brand"}
            />
          )}
        </div>

        {total > 0 && (
          <div className="mt-5 flex gap-2" role="group" aria-label="문제 필터">
            {filters.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(f.value)}
                  className={`h-10 rounded-full px-4 text-sm ${
                    active
                      ? "bg-ink font-bold text-bg"
                      : "border border-border bg-surface font-medium text-ink"
                  }`}
                >
                  {f.label} {f.count}
                </button>
              );
            })}
          </div>
        )}

        {total === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-card bg-surface px-6 py-10 text-center shadow-card">
            <p className="text-base font-bold text-ink">아직 문제가 없어요</p>
            <p className="text-sm text-muted">사진을 찍거나 직접 입력해서 첫 문제를 추가해 보세요.</p>
          </div>
        ) : visibleQuestions.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted">해당하는 문제가 없어요.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2.5">
            {visibleQuestions.map((question) => (
              <li key={question.id}>
                <Link
                  to={`/archives/${archiveId}/questions/${question.id}/edit`}
                  className="flex gap-3.5 rounded-card bg-surface p-4 shadow-card hover:ring-1 hover:ring-border"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      <QuestionTypeChip question={question} />
                      <StatusChip status={question.status} />
                    </div>
                    <p
                      className={`line-clamp-2 text-[15px] font-medium leading-normal ${
                        question.status === "correct" ? "text-muted" : "text-ink"
                      }`}
                    >
                      {previewText(question)}
                    </p>
                  </div>
                  {question.promptImages.length > 0 && (
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-control">
                      <BlobThumb
                        blob={question.promptImages[0]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      {question.promptImages.length > 1 && (
                        <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1.5 text-[11px] font-bold text-white">
                          {question.promptImages.length}장
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sticky bottom-0 flex gap-2.5 border-t border-border bg-bg px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        <Link
          to={`/archives/${archiveId}/questions/new`}
          className={`flex h-14 items-center justify-center gap-1.5 rounded-[18px] border border-border bg-surface px-5 text-[15px] font-bold text-ink ${
            total === 0 ? "flex-1" : ""
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          {total === 0 ? "문제 추가" : "문제"}
        </Link>
        {total > 0 && (
          <Link
            to={`/archives/${archiveId}/solve${remaining > 0 ? "" : "?all=1"}`}
            className="flex h-14 flex-1 items-center justify-center rounded-[18px] bg-primary text-base font-bold text-white shadow-primary hover:bg-primary-hover"
          >
            {remaining > 0 ? `복습 시작 · ${remaining}문제` : "전체 다시 풀기"}
          </Link>
        )}
      </div>

      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title={archive.name}>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setRenaming(true);
            }}
            className="h-12 rounded-control bg-surface-sunken px-4 text-left text-base font-medium text-ink"
          >
            이름 바꾸기
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              handleDelete();
            }}
            className="h-12 rounded-control bg-wrong-soft px-4 text-left text-base font-medium text-wrong"
          >
            노트 삭제
          </button>
        </div>
      </BottomSheet>

      {renaming && (
        <NameSheet
          open={renaming}
          title="이름 바꾸기"
          submitLabel="저장"
          initialValue={archive.name}
          onSubmit={handleRename}
          onClose={() => setRenaming(false)}
        />
      )}
    </main>
  );
}
