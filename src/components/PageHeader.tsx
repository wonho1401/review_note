import type { ReactNode } from "react";
import { Link } from "react-router";
import ThemeToggle from "@/components/ThemeToggle";

interface PageHeaderProps {
  title?: string;
  backTo?: string;
  backLabel?: string;
  /** Extra buttons shown before the theme toggle. */
  actions?: ReactNode;
}

export default function PageHeader({
  title,
  backTo,
  backLabel = "뒤로가기",
  actions,
}: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 bg-bg/85 px-5 pb-3 pt-4 backdrop-blur-md">
      {backTo && (
        <Link
          to={backTo}
          aria-label={backLabel}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-border bg-surface text-ink hover:border-brand"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
      )}
      {title ? (
        <h1 className="min-w-0 flex-1 truncate text-xl font-extrabold tracking-tight text-ink">
          {title}
        </h1>
      ) : (
        <div className="flex-1" />
      )}
      {actions}
      <ThemeToggle />
    </header>
  );
}
