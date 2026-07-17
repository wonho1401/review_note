import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold text-ink">페이지를 찾을 수 없습니다</h1>
      <Link to="/" className="mt-4 inline-block text-primary">
        홈으로
      </Link>
    </main>
  );
}
