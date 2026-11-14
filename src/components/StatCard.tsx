import type { ReactNode } from "react";

interface StatCardProps {
  tone: "wrong" | "correct" | "brand";
  value: string;
  label: string;
  icon: ReactNode;
}

export default function StatCard({ tone, value, label, icon }: StatCardProps) {
  const toneClass =
    tone === "wrong"
      ? "bg-wrong-soft text-wrong"
      : tone === "correct"
        ? "bg-correct-soft text-correct"
        : "bg-primary-soft text-brand";
  return (
    <div className="flex flex-col gap-2.5 rounded-card bg-surface p-3.5 shadow-card">
      <span className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${toneClass}`}>
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
          {icon}
        </svg>
      </span>
      <div className="flex flex-col">
        <span className="text-[22px] font-extrabold text-ink">{value}</span>
        <span className="text-xs text-muted">{label}</span>
      </div>
    </div>
  );
}
