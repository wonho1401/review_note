import { Link, useParams } from "react-router";

export default function QuestionEditPage() {
  const { archiveId, questionId } = useParams();
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold text-ink">문제 추가·편집</h1>
      <p className="mt-2 text-sm text-muted">archiveId: {archiveId}</p>
      <p className="text-sm text-muted">questionId: {questionId ?? "(신규)"}</p>
      <Link to={`/archives/${archiveId}`} className="mt-4 inline-block text-primary">
        아카이브로
      </Link>
    </main>
  );
}
