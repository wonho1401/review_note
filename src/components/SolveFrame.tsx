import type { ReactNode } from "react";
import { Link } from "react-router";
import ThemeToggle from "@/components/ThemeToggle";

interface SolveFrameProps {
  closeTo: string;
  title: string;
  /** "3 / 7" and a bar; omitted on screens without a current question. */
  progress?: { current: number; total: number; done: number };
  /** Controls under the progress row (e.g. the 남은/전체 toggle). */
  toolbar?: ReactNode;
  children: ReactNode;
}

/** Indigo backdrop with the question on a white sheet rising from below. */
export default function SolveFrame({ closeTo, title, progress, toolbar, children }: SolveFrameProps) {
  return (
    <main className="flex min-h-svh flex-col bg-hero">
      <div className="flex flex-col gap-4 px-5 pb-5 pt-5">
        <div className="flex items-center gap-3">
          <Link
            to={closeTo}
            aria-label="풀이 끝내기"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-white/15 text-white hover:bg-white/25"
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
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex justify-between gap-2 text-[13px] text-white/85">
              <span className="truncate">{title}</span>
              {progress && (
                <span className="shrink-0 font-bold text-white">
                  {progress.current} / {progress.total}
                </span>
              )}
            </div>
            {progress && (
              <div
                role="progressbar"
                aria-label="풀이 진행"
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-valuenow={progress.done}
                className="h-1.5 rounded-full bg-white/20"
              >
                <div
                  className="h-1.5 rounded-full bg-white transition-[width]"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
          <ThemeToggle tone="hero" />
        </div>
        {toolbar}
      </div>

      <section className="flex flex-1 flex-col gap-4 rounded-t-sheet bg-surface px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
        {children}
      </section>
    </main>
  );
}
