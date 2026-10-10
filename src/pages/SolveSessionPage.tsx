import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getArchive } from "@/api/archive";
import { listQuestionsByArchive, updateQuestion } from "@/api/question";
import { gradeMcq, gradeOx } from "@/util/grading";
import { selectSessionQueue, summarizeSession } from "@/util/session";
import BlobImage from "@/components/BlobImage";
import type { Archive, Question, Status } from "@/types/domain";
import type { SessionResult } from "@/util/session";

function mcqChoiceClass(
  index: number,
  question: Question,
  selectedChoice: number | null,
  graded: boolean,
): string {
  if (graded) {
    if (index === question.correctChoice) return "border-correct text-correct";
    if (index === selectedChoice) return "border-wrong text-wrong";
    return "border-border text-muted";
  }
  return index === selectedChoice
    ? "border-primary bg-primary text-white"
    : "border-border bg-surface text-ink";
}

function oxButtonClass(
  value: boolean,
  question: Question,
  selectedOx: boolean | null,
  graded: boolean,
): string {
  if (graded) {
    if (value === question.oxAnswer) return "border-correct text-correct";
    if (value === selectedOx) return "border-wrong text-wrong";
    return "border-border text-muted";
  }
  return value === selectedOx
    ? "border-primary bg-primary text-white"
    : "border-border bg-surface text-ink";
}

function referenceAnswerText(question: Question): string {
  if (question.type === "mcq") {
    const idx = question.correctChoice;
    const text = idx !== undefined ? question.choices?.[idx] : undefined;
    return text ? `정답: ${text}` : "정답 정보가 없어요";
  }
  if (question.type === "ox") {
    return `정답: ${question.oxAnswer ? "O" : "X"}`;
  }
  return "";
}

export default function SolveSessionPage() {
  const { archiveId } = useParams();

  const [archive, setArchive] = useState<Archive | null | undefined>(undefined);
  const [allQuestions, setAllQuestions] = useState<Question[] | null>(null);
  // `queue` is a snapshot, not derived live from `allQuestions`: it only gets
  // recomputed on initial load or an explicit 전체 보기 toggle. If it were
  // recalculated on every grade (e.g. via useMemo keyed on allQuestions), a
  // just-graded "correct" question would immediately drop out of the default
  // filter mid-pass, shifting every later index by one and silently skipping
  // the next question.
  const [queue, setQueue] = useState<Question[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [selectedOx, setSelectedOx] = useState<boolean | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [graded, setGraded] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [grading, setGrading] = useState(false);
  const [results, setResults] = useState<SessionResult[]>([]);

  useEffect(() => {
    if (!archiveId) return;
    let cancelled = false;
    Promise.all([getArchive(archiveId), listQuestionsByArchive(archiveId)]).then(
      ([a, qs]) => {
        if (cancelled) return;
        setArchive(a ?? null);
        setAllQuestions(qs);
        setQueue(selectSessionQueue(qs, false));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [archiveId]);

  const currentQuestion = queue[currentIndex];

  function resetAnswerState() {
    setSelectedChoice(null);
    setSelectedOx(null);
    setRevealed(false);
    setGraded(false);
    setWasCorrect(null);
  }

  function handleToggleShowAll() {
    if (!allQuestions) return;
    const next = !showAll;
    setShowAll(next);
    setQueue(selectSessionQueue(allQuestions, next));
    setCurrentIndex(0);
    resetAnswerState();
  }

  function handleNext() {
    resetAnswerState();
    setCurrentIndex((i) => i + 1);
  }

  async function finalizeGrade(correct: boolean) {
    if (!currentQuestion || grading) return;
    setGrading(true);
    const newStatus: Status = correct ? "correct" : "wrong";
    try {
      await updateQuestion(currentQuestion.id, { status: newStatus, lastResult: newStatus });
      setAllQuestions((prev) =>
        prev
          ? prev.map((q) =>
              q.id === currentQuestion.id ? { ...q, status: newStatus, lastResult: newStatus } : q,
            )
          : prev,
      );
      setResults((prev) => [...prev, { questionId: currentQuestion.id, result: newStatus }]);
      setWasCorrect(correct);
      setGraded(true);
    } finally {
      setGrading(false);
    }
  }

  function handleGrade() {
    if (!currentQuestion) return;
    switch (currentQuestion.type) {
      case "mcq":
        if (selectedChoice === null) return;
        finalizeGrade(gradeMcq(currentQuestion, selectedChoice));
        return;
      case "ox":
        if (selectedOx === null) return;
        finalizeGrade(gradeOx(currentQuestion, selectedOx));
        return;
      case "essay":
        return;
    }
  }

  if (!archiveId) {
    return (
      <main className="p-6">
        <p className="text-sm text-wrong">잘못된 접근입니다.</p>
        <Link to="/" className="mt-4 inline-block text-primary">
          홈으로
        </Link>
      </main>
    );
  }

  if (archive === undefined || allQuestions === null) {
    return (
      <main className="p-6">
        <p className="text-sm text-muted">불러오는 중…</p>
      </main>
    );
  }

  if (archive === null) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold text-ink">아카이브를 찾을 수 없습니다</h1>
        <Link to="/" className="mt-4 inline-block text-primary">
          홈으로
        </Link>
      </main>
    );
  }

  if (queue.length === 0) {
    return (
      <main className="p-6">
        <Link to={`/archives/${archiveId}`} className="text-sm text-primary">
          아카이브로
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">풀이 세션</h1>
        <p className="mt-4 text-sm text-muted">풀 문제가 없어요.</p>
        {!showAll && (
          <>
            <p className="mt-1 text-sm text-muted">
              전체 보기를 켜면 맞힌 문제도 다시 풀 수 있어요.
            </p>
            <button
              type="button"
              onClick={handleToggleShowAll}
              className="mt-4 shrink-0 whitespace-nowrap rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              전체 보기 켜기
            </button>
          </>
        )}
      </main>
    );
  }

  if (currentIndex >= queue.length) {
    const { gradedCount, correctCount } = summarizeSession(results);
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold text-ink">다 풀었어요!</h1>
        <p className="mt-2 text-sm text-ink">
          {gradedCount}문제 중 {correctCount}문제를 맞혔어요.
        </p>
        <Link to={`/archives/${archiveId}`} className="mt-4 inline-block text-primary">
          아카이브로
        </Link>
      </main>
    );
  }

  return (
    <main className="p-6">
      <Link to={`/archives/${archiveId}`} className="text-sm text-primary">
        아카이브로
      </Link>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {currentIndex + 1} / {queue.length}
        </p>
        <button
          type="button"
          onClick={handleToggleShowAll}
          className="shrink-0 whitespace-nowrap rounded-control border border-border bg-surface px-3 py-1.5 text-xs text-ink hover:border-primary"
        >
          {showAll ? "전체 보기 끄기" : "전체 보기"}
        </button>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-base text-ink">{currentQuestion.promptText}</p>
      {currentQuestion.promptImage && (
        <BlobImage
          blob={currentQuestion.promptImage}
          alt="문제 사진"
          className="mt-3 max-h-64 rounded-card border border-border object-contain"
        />
      )}

      {currentQuestion.type === "mcq" && (
        <div className="mt-4 flex flex-col gap-2">
          {(currentQuestion.choices ?? []).map((choice, index) => (
            <button
              key={index}
              type="button"
              disabled={graded}
              onClick={() => setSelectedChoice(index)}
              className={`rounded-control border px-4 py-2 text-left text-sm font-medium ${mcqChoiceClass(index, currentQuestion, selectedChoice, graded)}`}
            >
              {choice}
            </button>
          ))}
        </div>
      )}

      {currentQuestion.type === "ox" && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={graded}
            onClick={() => setSelectedOx(true)}
            className={`flex-1 rounded-control border px-4 py-2 text-sm font-medium ${oxButtonClass(true, currentQuestion, selectedOx, graded)}`}
          >
            O
          </button>
          <button
            type="button"
            disabled={graded}
            onClick={() => setSelectedOx(false)}
            className={`flex-1 rounded-control border px-4 py-2 text-sm font-medium ${oxButtonClass(false, currentQuestion, selectedOx, graded)}`}
          >
            X
          </button>
        </div>
      )}

      {currentQuestion.type === "essay" && (
        <div className="mt-4">
          {!revealed ? (
            <p className="text-sm text-muted">정답을 확인하고 스스로 채점해 보세요.</p>
          ) : (
            <div>
              <p className="text-sm font-medium text-ink">모범답안</p>
              {currentQuestion.answerText && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
                  {currentQuestion.answerText}
                </p>
              )}
              {currentQuestion.answerImage && (
                <BlobImage
                  blob={currentQuestion.answerImage}
                  alt="정답 사진"
                  className="mt-3 max-h-64 rounded-card border border-border object-contain"
                />
              )}
              {!graded && (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    disabled={grading}
                    onClick={() => finalizeGrade(true)}
                    className="flex-1 rounded-control border border-correct px-4 py-2 text-sm font-medium text-correct hover:bg-correct/10 disabled:opacity-60"
                  >
                    맞았어요
                  </button>
                  <button
                    type="button"
                    disabled={grading}
                    onClick={() => finalizeGrade(false)}
                    className="flex-1 rounded-control border border-wrong px-4 py-2 text-sm font-medium text-wrong hover:bg-wrong/10 disabled:opacity-60"
                  >
                    틀렸어요
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {graded && wasCorrect !== null && (
        <div className="mt-4">
          <p className={`text-2xl font-semibold ${wasCorrect ? "text-correct" : "text-wrong"}`}>
            {wasCorrect ? "O 맞았어요" : "X 틀렸어요"}
          </p>
          {!wasCorrect && currentQuestion.type !== "essay" && (
            <p className="mt-1 text-sm text-muted">{referenceAnswerText(currentQuestion)}</p>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {currentQuestion.type === "essay" && !revealed && (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="shrink-0 whitespace-nowrap rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            정답 보기
          </button>
        )}
        {currentQuestion.type !== "essay" && !graded && (
          <button
            type="button"
            onClick={handleGrade}
            disabled={
              grading ||
              (currentQuestion.type === "mcq" && selectedChoice === null) ||
              (currentQuestion.type === "ox" && selectedOx === null)
            }
            className="shrink-0 whitespace-nowrap rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
          >
            채점하기
          </button>
        )}
        {graded && (
          <button
            type="button"
            onClick={handleNext}
            className="shrink-0 whitespace-nowrap rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            다음 문제
          </button>
        )}
      </div>
    </main>
  );
}
