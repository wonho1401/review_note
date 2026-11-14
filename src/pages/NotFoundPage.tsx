import { Link } from "react-router";
import PageHeader from "@/components/PageHeader";

export default function NotFoundPage() {
  return (
    <main>
      <PageHeader backTo="/" backLabel="홈으로" />
      <div className="flex flex-col items-center gap-3 px-5 pt-20 text-center">
        <p className="text-5xl font-extrabold text-brand">404</p>
        <h1 className="text-xl font-extrabold text-ink">페이지를 찾을 수 없어요</h1>
        <p className="text-sm text-muted">주소가 바뀌었거나 삭제된 페이지예요.</p>
        <Link
          to="/"
          className="mt-4 flex h-12 items-center rounded-control bg-primary px-6 text-base font-bold text-white hover:bg-primary-hover"
        >
          홈으로 가기
        </Link>
      </div>
    </main>
  );
}
