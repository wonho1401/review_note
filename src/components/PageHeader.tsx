import { Link } from "react-router";
import { useThemeStore } from "@/store/themeStore";

interface PageHeaderProps {
  title: string;
  backTo?: string;
  backLabel?: string;
}

export default function PageHeader({ title, backTo, backLabel = "뒤로가기" }: PageHeaderProps) {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface px-6 py-4">
      {backTo && (
        <Link
          to={backTo}
          aria-label={backLabel}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink hover:bg-bg"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M12.5 15L7.5 10L12.5 5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      )}
      <h1 className="flex-1 truncate text-xl font-semibold text-ink sm:text-2xl">{title}</h1>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink hover:bg-bg"
      >
        {theme === "dark" ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        )}
      </button>
    </header>
  );
}
