import type { Status } from "@/types/domain";

function chip(status: Status): { label: string; className: string } {
  switch (status) {
    case "correct":
      return { label: "맞힘", className: "bg-correct-soft text-correct" };
    case "wrong":
      return { label: "틀림", className: "bg-wrong-soft text-wrong" };
    case "unsolved":
      return { label: "안 풀었어요", className: "bg-neutral-soft text-neutral" };
  }
}

export default function StatusChip({ status }: { status: Status }) {
  const { label, className } = chip(status);
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-bold ${className}`}>
      {label}
    </span>
  );
}
