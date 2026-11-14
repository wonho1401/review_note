import { useEffect, useState } from "react";
import { Link } from "react-router";
import { createArchive, listArchives } from "@/api/archive";
import { countQuestionsByArchive } from "@/api/question";
import { summarizeHome } from "@/util/homeSummary";
import NameSheet from "@/components/NameSheet";
import ProgressRing from "@/components/ProgressRing";
import StatCard from "@/components/StatCard";
import ThemeToggle from "@/components/ThemeToggle";
import type { Archive, ArchiveProgress } from "@/types/domain";

const EMPTY_PROGRESS: ArchiveProgress = { total: 0, correct: 0, wrong: 0 };

function greeting(hour: number): string {
  if (hour < 5) return "늦은 밤이에요";
  if (hour < 12) return "좋은 아침이에요";
  if (hour < 18) return "좋은 오후예요";
  return "좋은 저녁이에요";
}

function archiveSubtitle(progress: ArchiveProgress): string {
  if (progress.total === 0) return "아직 문제가 없어요";
  if (progress.correct === progress.total) return "모두 맞혔어요";
  return `문제 ${progress.total} · 남은 ${progress.total - progress.correct}`;
}

export default function HomePage() {
  const [archives, setArchives] = useState<Archive[] | null>(null);
  const [progress, setProgress] = useState<Record<string, ArchiveProgress>>({});
  const [creating, setCreating] = useState(false);

  async function refresh() {
    const [a, p] = await Promise.all([listArchives(), countQuestionsByArchive()]);
    setArchives(a);
    setProgress(p);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([listArchives(), countQuestionsByArchive()]).then(([a, p]) => {
      if (cancelled) return;
      setArchives(a);
      setProgress(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(name: string) {
    await createArchive(name);
    setCreating(false);
    await refresh();
  }

  const summary = archives ? summarizeHome(archives, progress) : null;
  const continueProgress = summary?.continueArchive
    ? (progress[summary.continueArchive.id] ?? EMPTY_PROGRESS)
    : null;

  return (
    <main className="px-5 pb-32 pt-6">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 items-center justify-center rounded-control bg-primary-soft"
        >
          <svg width="26" height="26" viewBox="0 0 34 34" fill="none">
            <rect x="5" y="20" width="24" height="7" rx="3.5" fill="#FDE68A" />
            <circle cx="12" cy="13" r="6" className="stroke-brand" strokeWidth="3" />
            <path
              d="M21 8l8 9M29 8l-8 9"
              className="stroke-wrong"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div className="flex flex-1 flex-col">
          <span className="text-[13px] text-muted">{greeting(new Date().getHours())}</span>
          <span className="text-base font-bold text-ink">오답노트</span>
        </div>
        <ThemeToggle />
      </div>

      <h1 className="mt-6 text-[26px] font-extrabold leading-snug tracking-tight text-ink">
        오늘도 틀린 문제를
        <br />
        다시 풀어 볼까요?
      </h1>

      {summary && archives && archives.length > 0 && (
        <>
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <StatCard
              tone="wrong"
              value={String(summary.remaining)}
              label="남은 문제"
              icon={<path d="M6 6l12 12M18 6L6 18" />}
            />
            <StatCard
              tone="correct"
              value={String(summary.correct)}
              label="맞힌 문제"
              icon={<circle cx="12" cy="12" r="7" />}
            />
            <StatCard
              tone="brand"
              value={summary.accuracy === null ? "–" : `${Math.round(summary.accuracy * 100)}%`}
              label="정답률"
              icon={
                <>
                  <path d="M4 16l5-5 4 4 7-7" />
                  <path d="M15 8h5v5" />
                </>
              }
            />
          </div>

          {summary.continueArchive && continueProgress && (
            <section className="relative mt-4 overflow-hidden rounded-[28px] bg-hero p-5 shadow-primary">
              <span
                aria-hidden="true"
                className="absolute -right-10 -top-10 h-40 w-40 rounded-full border-2 border-white/10"
              />
              <p className="text-[13px] text-white/75">이어서 복습하기</p>
              <h2 className="mt-1 truncate text-xl font-extrabold text-white">
                {summary.continueArchive.name}
              </h2>
              <div className="mt-4 flex justify-between text-[13px] text-white/85">
                <span>남은 문제 {continueProgress.total - continueProgress.correct}개</span>
                <span>
                  {continueProgress.correct} / {continueProgress.total} 맞힘
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/20">
                <div
                  className="h-2 rounded-full bg-white"
                  style={{
                    width: `${(continueProgress.correct / continueProgress.total) * 100}%`,
                  }}
                />
              </div>
              <Link
                to={`/archives/${summary.continueArchive.id}/solve`}
                className="mt-4 inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-5 text-[15px] font-bold text-[#3B36DB]"
              >
                복습 시작
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </section>
          )}
        </>
      )}

      <div className="mt-7 flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">내 노트</h2>
        {archives && archives.length > 0 && (
          <span className="text-[13px] text-muted">{archives.length}개</span>
        )}
      </div>

      {archives === null ? (
        <p className="mt-4 text-sm text-muted">불러오는 중…</p>
      ) : archives.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-3 rounded-card bg-surface px-6 py-10 text-center shadow-card">
          <p className="text-base font-bold text-ink">첫 노트를 만들어 보세요</p>
          <p className="text-sm text-muted">과목이나 시험별로 노트를 만들고 틀린 문제를 모아요.</p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-2 h-12 rounded-control bg-primary px-6 text-base font-bold text-white hover:bg-primary-hover"
          >
            노트 만들기
          </button>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {archives.map((archive) => {
            const p = progress[archive.id] ?? EMPTY_PROGRESS;
            const allCorrect = p.total > 0 && p.correct === p.total;
            const ratio = p.total > 0 ? p.correct / p.total : 0;
            return (
              <li key={archive.id}>
                <Link
                  to={`/archives/${archive.id}`}
                  className="flex items-center gap-3.5 rounded-card bg-surface p-4 shadow-card hover:ring-1 hover:ring-border"
                >
                  <ProgressRing
                    value={ratio}
                    size={48}
                    strokeWidth={6}
                    label={`${Math.round(ratio * 100)}%`}
                    ariaLabel={`맞힘 ${p.correct}/${p.total}`}
                    tone={allCorrect ? "correct" : "brand"}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-base font-bold text-ink">{archive.name}</span>
                    <span
                      className={`text-[13px] ${allCorrect ? "font-medium text-correct" : "text-muted"}`}
                    >
                      {archiveSubtitle(p)}
                    </span>
                  </div>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="shrink-0 text-muted"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {archives && archives.length > 0 && (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="fixed bottom-[max(2rem,env(safe-area-inset-bottom))] right-[max(1.25rem,calc((100vw-560px)/2+1.25rem))] flex h-14 items-center gap-2 rounded-full bg-ink pl-[18px] pr-[22px] text-[15px] font-bold text-bg shadow-[0_12px_28px_rgb(23_21_59/0.3)]"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          새 노트
        </button>
      )}

      {creating && (
        <NameSheet
          open={creating}
          title="새 노트"
          submitLabel="만들기"
          onSubmit={handleCreate}
          onClose={() => setCreating(false)}
        />
      )}
    </main>
  );
}
