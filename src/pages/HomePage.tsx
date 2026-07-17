import { useEffect, useState, type SubmitEvent } from "react";
import { Link } from "react-router";
import {
  createArchive,
  deleteArchive,
  listArchives,
  updateArchive,
} from "@/api/archive";
import type { Archive } from "@/types/domain";

export default function HomePage() {
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function refresh() {
    setArchives(await listArchives());
  }

  useEffect(() => {
    listArchives()
      .then(setArchives)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: SubmitEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setFormError("이름을 입력해 주세요");
      return;
    }
    setFormError(null);
    await createArchive(trimmed);
    setNewName("");
    await refresh();
  }

  async function handleRename(archive: Archive) {
    const nextName = window.prompt("아카이브 이름 바꾸기", archive.name);
    if (nextName === null) return;
    const trimmed = nextName.trim();
    if (!trimmed) return;
    await updateArchive(archive.id, { name: trimmed });
    await refresh();
  }

  async function handleDelete(archive: Archive) {
    const ok = window.confirm(
      `"${archive.name}"을(를) 삭제할까요? 포함된 문제도 함께 삭제됩니다.`,
    );
    if (!ok) return;
    await deleteArchive(archive.id);
    await refresh();
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold text-ink">홈</h1>

      <form onSubmit={handleCreate} className="mt-4 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="아카이브 이름"
          className="flex-1 rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted"
        />
        <button
          type="submit"
          className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          새 아카이브 만들기
        </button>
      </form>
      {formError && <p className="mt-1 text-xs text-wrong">{formError}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-muted">불러오는 중…</p>
      ) : archives.length === 0 ? (
        <p className="mt-6 text-sm text-muted">첫 아카이브를 만들어 보세요</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {archives.map((archive) => (
            <li
              key={archive.id}
              className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4"
            >
              <Link to={`/archives/${archive.id}`} className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-ink">{archive.name}</p>
                <p className="text-xs text-muted">
                  {new Date(archive.createdAt).toLocaleDateString("ko-KR")}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRename(archive)}
                  className="rounded-control px-2 py-1 text-xs text-muted hover:text-ink"
                >
                  이름 바꾸기
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(archive)}
                  className="rounded-control px-2 py-1 text-xs text-wrong hover:underline"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
