import type { Archive, ArchiveProgress } from "@/types/domain";

export interface HomeSummary {
  remaining: number;
  correct: number;
  /** correct / (correct + wrong); null until something has been graded. */
  accuracy: number | null;
  /** Archive to suggest for "이어서 복습", or null when nothing is left. */
  continueArchive: Archive | null;
}

const EMPTY: ArchiveProgress = { total: 0, correct: 0, wrong: 0 };

export function summarizeHome(
  archives: Archive[],
  progress: Record<string, ArchiveProgress>,
): HomeSummary {
  let total = 0;
  let correct = 0;
  let wrong = 0;
  for (const archive of archives) {
    const p = progress[archive.id] ?? EMPTY;
    total += p.total;
    correct += p.correct;
    wrong += p.wrong;
  }

  // Prefer the most recently studied archive that still has questions left;
  // never-studied ones follow, oldest first (the order they were created).
  const candidates = archives.filter((a) => {
    const p = progress[a.id] ?? EMPTY;
    return p.total - p.correct > 0;
  });
  candidates.sort((a, b) => {
    const byStudied = (b.lastStudiedAt ?? 0) - (a.lastStudiedAt ?? 0);
    return byStudied !== 0 ? byStudied : a.createdAt - b.createdAt;
  });

  return {
    remaining: total - correct,
    correct,
    accuracy: correct + wrong > 0 ? correct / (correct + wrong) : null,
    continueArchive: candidates[0] ?? null,
  };
}
