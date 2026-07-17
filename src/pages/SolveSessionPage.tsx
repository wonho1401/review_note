import { Link, useParams } from "react-router";

export default function SolveSessionPage() {
  const { archiveId } = useParams();
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold text-ink">풀이 세션</h1>
      <p className="mt-2 text-sm text-muted">archiveId: {archiveId}</p>
      <Link to={`/archives/${archiveId}`} className="mt-4 inline-block text-primary">
        아카이브로
      </Link>
    </main>
  );
}
