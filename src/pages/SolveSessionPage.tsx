import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { getArchive, updateArchive } from "@/api/archive";
import { listQuestionsByArchive, updateQuestion } from "@/api/question";
import { gradeMcq, gradeOx } from "@/util/grading";
import { selectSessionQueue, summarizeSession } from "@/util/session";
import BlobImage from "@/components/BlobImage";
import HighlightableText from "@/components/HighlightableText";
import PageHeader from "@/components/PageHeader";
import ProgressRing from "@/components/ProgressRing";
import QuestionTypeChip from "@/components/QuestionTypeChip";
import SolveFrame from "@/components/SolveFrame";
import type { HighlightStyle, TextRange } from "@/util/textAnnotation";
import type { Annotation, Archive, Question, Status } from "@/types/domain";
import type { SessionResult } from "@/util/session";

const PRIMARY_BUTTON =
  "flex h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-primary text-base font-bold text-white hover:bg-primary-hover disabled:opacity-45 disabled:hover:bg-primary";

/** Shared look for an answer option (MCQ choice or an O/X button). */
function optionClass(
  isSelected: boolean,
  isAnswer: boolean,
  graded: boolean,
): string {
  if (graded) {
    if (isAnswer) return "border-correct bg-correct-soft text-correct";
    if (isSelected) return "border-wrong bg-wrong-soft text-wrong";
    return "border-border bg-surface text-muted";
  }
  return isSelected
    ? "border-primary bg-primary text-white"
    : "border-border bg-surface-sunken text-ink hover:border-brand";
}

function referenceAnswerText(question: Question): string {
  if (question.type === "mcq") {
    const idx = question.correctChoice;
    const text = idx !== undefined ? question.choices?.[idx] : undefined;
    return text ? `정답: ${text}` : "정답 정보가 없어요";
  }
  if (question.type === "ox") {
    const items = question.oxItems ?? [];
    if (items.length === 1) return `정답: ${items[0].answer ? "O" : "X"}`;
    return `정답: ${items.map((item, i) => `${i + 1} ${item.answer ? "O" : "X"}`).join(" · ")}`;
  }
  return "다음 복습에 다시 나와요";
}

export default function SolveSessionPage() {
  const { archiveId } = useParams();
  const [searchParams] = useSearchParams();
  const startWithAll = searchParams.get("all") === "1";

  const [archive, setArchive] = useState<Archive | null | undefined>(undefined);
  const [allQuestions, setAllQuestions] = useState<Question[] | null>(null);
  // `queue` is a snapshot, not derived live from `allQuestions`: it only gets
  // recomputed on initial load or an explicit 전체 보기 toggle. If it were
  // recalculated on every grade (e.g. via useMemo keyed on allQuestions), a
  // just-graded "correct" question would immediately drop out of the default
  // filter mid-pass, shifting every later index by one and silently skipping
  // the next question.
  const [queue, setQueue] = useState<Question[]>([]);
  const [showAll, setShowAll] = useState(startWithAll);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  // One entry per OX item, by index; missing/null = not answered yet.
  const [selectedOx, setSelectedOx] = useState<(boolean | null)[]>([]);
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
        setQueue(selectSessionQueue(qs, startWithAll));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [archiveId, startWithAll]);

  const currentQuestion = queue[currentIndex];
  const oxItems = currentQuestion?.type === "ox" ? (currentQuestion.oxItems ?? []) : [];
  const answeredOxCount = oxItems.filter((_, i) => typeof selectedOx[i] === "boolean").length;
  const allOxAnswered = oxItems.length > 0 && answeredOxCount === oxItems.length;

  function resetAnswerState() {
    setSelectedChoice(null);
    setSelectedOx([]);
    setRevealed(false);
    setGraded(false);
    setWasCorrect(null);
  }

  function applyShowAll(next: boolean) {
    if (!allQuestions || next === showAll) return;
    setShowAll(next);
    setQueue(selectSessionQueue(allQuestions, next));
    setCurrentIndex(0);
    resetAnswerState();
  }

  function restartWithRemaining() {
    if (!allQuestions) return;
    setShowAll(false);
    setQueue(selectSessionQueue(allQuestions, false));
    setCurrentIndex(0);
    setResults([]);
    resetAnswerState();
  }

  function handleSelectOx(index: number, value: boolean) {
    setSelectedOx((prev) => {
      const next = oxItems.map((_, i) => prev[i] ?? null);
      next[index] = value;
      return next;
    });
  }

  function handleNext() {
    resetAnswerState();
    setCurrentIndex((i) => i + 1);
  }

  async function finalizeGrade(correct: boolean) {
    if (!currentQuestion || !archiveId || grading) return;
    setGrading(true);
    const newStatus: Status = correct ? "correct" : "wrong";
    try {
      await Promise.all([
        updateQuestion(currentQuestion.id, { status: newStatus, lastResult: newStatus }),
        updateArchive(archiveId, { lastStudiedAt: Date.now() }),
      ]);
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

  async function saveAnnotations(annotations: Annotation[]) {
    if (!currentQuestion) return;
    await updateQuestion(currentQuestion.id, { annotations });
    const patch = (q: Question): Question =>
      q.id === currentQuestion.id ? { ...q, annotations } : q;
    setAllQuestions((prev) => (prev ? prev.map(patch) : prev));
    setQueue((prev) => prev.map(patch));
  }

  function handleAddTextAnnotation(start: number, end: number, style: HighlightStyle) {
    if (!currentQuestion) return;
    saveAnnotations([
      ...currentQuestion.annotations,
      { target: "text", field: "answerText", start, end, style },
    ]);
  }

  function handleClearTextAnnotations() {
    if (!currentQuestion) return;
    saveAnnotations(currentQuestion.annotations.filter((a) => a.field !== "answerText"));
  }

  function handleGrade() {
    if (!currentQuestion) return;
    switch (currentQuestion.type) {
      case "mcq":
        if (selectedChoice === null) return;
        finalizeGrade(gradeMcq(currentQuestion, selectedChoice));
        return;
      case "ox":
        if (!allOxAnswered) return;
        finalizeGrade(gradeOx(currentQuestion, selectedOx));
        return;
      case "essay":
        return;
    }
  }

  if (!archiveId) {
    return (
      <main>
        <PageHeader backTo="/" title="잘못된 주소예요" />
      </main>
    );
  }

  const closeTo = `/archives/${archiveId}`;

  if (archive === undefined || allQuestions === null) {
    return (
      <SolveFrame closeTo={closeTo} title="불러오는 중…">
        <p className="text-sm text-muted">불러오는 중…</p>
      </SolveFrame>
    );
  }

  if (archive === null) {
    return (
      <main>
        <PageHeader backTo="/" title="노트를 찾을 수 없어요" />
      </main>
    );
  }

  const modeToggle = (
    <div className="flex gap-1.5" role="group" aria-label="풀이 범위">
      {([false, true] as const).map((all) => {
        const active = showAll === all;
        return (
          <button
            key={String(all)}
            type="button"
            aria-pressed={active}
            onClick={() => applyShowAll(all)}
            className={`h-8 rounded-full px-3 text-[13px] ${
              active ? "bg-white font-bold text-[#3B36DB]" : "bg-white/15 font-medium text-white"
            }`}
          >
            {all ? "전체 보기" : "남은 문제만"}
          </button>
        );
      })}
    </div>
  );

  if (queue.length === 0) {
    return (
      <SolveFrame closeTo={closeTo} title={archive.name} toolbar={modeToggle}>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-lg font-extrabold text-ink">풀 문제가 없어요</p>
          {!showAll && (
            <p className="text-sm text-muted">전체 보기를 켜면 맞힌 문제도 다시 풀 수 있어요.</p>
          )}
        </div>
        {!showAll && (
          <button type="button" onClick={() => applyShowAll(true)} className={PRIMARY_BUTTON}>
            전체 다시 풀기
          </button>
        )}
      </SolveFrame>
    );
  }

  if (currentIndex >= queue.length) {
    const { gradedCount, correctCount } = summarizeSession(results);
    const wrongLeft = allQuestions.some((q) => q.status !== "correct");
    return (
      <SolveFrame closeTo={closeTo} title={archive.name}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <ProgressRing
            value={gradedCount > 0 ? correctCount / gradedCount : 0}
            size={128}
            strokeWidth={12}
            label={`${correctCount}/${gradedCount}`}
            sublabel="맞힘"
            ariaLabel={`${gradedCount}문제 중 ${correctCount}문제 맞힘`}
            tone={correctCount === gradedCount ? "correct" : "brand"}
          />
          <div className="flex flex-col gap-1">
            <p className="text-2xl font-extrabold text-ink">다 풀었어요!</p>
            <p className="text-[15px] text-muted">
              {gradedCount}문제 중 {correctCount}문제를 맞혔어요.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {wrongLeft && (
            <button type="button" onClick={restartWithRemaining} className={PRIMARY_BUTTON}>
              남은 문제 다시 풀기
            </button>
          )}
          <Link
            to={closeTo}
            className={
              wrongLeft
                ? "flex h-14 items-center justify-center rounded-[18px] border border-border bg-surface text-base font-bold text-ink"
                : PRIMARY_BUTTON
            }
          >
            노트로 돌아가기
          </Link>
        </div>
      </SolveFrame>
    );
  }

  const textRanges: TextRange[] = currentQuestion.annotations
    .filter((a) => a.field === "answerText")
    .map((a) => ({ start: a.start, end: a.end, style: a.style }));

  const isLast = currentIndex === queue.length - 1;

  return (
    <SolveFrame
      closeTo={closeTo}
      title={archive.name}
      progress={{
        current: currentIndex + 1,
        total: queue.length,
        done: currentIndex + (graded ? 1 : 0),
      }}
      toolbar={modeToggle}
    >
      <div className="flex flex-col gap-3">
        <div>
          <QuestionTypeChip question={currentQuestion} />
        </div>
        {currentQuestion.promptText?.trim() && (
          <h2 className="whitespace-pre-wrap text-[19px] font-bold leading-relaxed text-ink">
            {currentQuestion.promptText}
          </h2>
        )}
        {currentQuestion.promptImages.length > 0 && (
          <div className="flex flex-col gap-3">
            {currentQuestion.promptImages.map((image, index) => (
              <BlobImage
                key={index}
                blob={image}
                alt={`문제 사진 ${index + 1}`}
                className="max-h-72 w-full rounded-card border border-border bg-surface-sunken object-contain"
              />
            ))}
          </div>
        )}
      </div>

      {currentQuestion.type === "mcq" && (
        <div className="flex flex-col gap-2">
          {(currentQuestion.choices ?? []).map((choice, index) => {
            const isSelected = index === selectedChoice;
            return (
              <button
                key={index}
                type="button"
                disabled={graded}
                aria-pressed={isSelected}
                onClick={() => setSelectedChoice(index)}
                className={`flex min-h-14 items-center gap-3 rounded-control border px-4 py-3 text-left text-[15px] font-medium ${optionClass(isSelected, index === currentQuestion.correctChoice, graded)}`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                    isSelected && !graded ? "bg-white/20" : "border border-current"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="whitespace-pre-wrap">{choice}</span>
              </button>
            );
          })}
        </div>
      )}

      {currentQuestion.type === "ox" && (
        <div className="flex flex-col gap-2.5">
          {oxItems.map((item, index) => {
            const selected = selectedOx[index] ?? null;
            const showNumber = oxItems.length > 1;
            // A lone OX with no statement keeps just the two big buttons.
            const boxed = showNumber || item.statement !== "";
            return (
              <div
                key={index}
                className={boxed ? "flex flex-col gap-3 rounded-card border border-border p-3.5" : ""}
              >
                {boxed && (
                  <p className="flex gap-2.5 whitespace-pre-wrap text-[15px] leading-normal text-ink">
                    {showNumber && (
                      <span className="shrink-0 font-extrabold text-brand">{index + 1}</span>
                    )}
                    <span>{item.statement}</span>
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {([true, false] as const).map((value) => (
                    <button
                      key={String(value)}
                      type="button"
                      disabled={graded}
                      onClick={() => handleSelectOx(index, value)}
                      aria-pressed={selected === value}
                      aria-label={showNumber ? `항목 ${index + 1} ${value ? "O" : "X"}` : undefined}
                      className={`h-12 rounded-control border text-lg font-extrabold ${optionClass(selected === value, item.answer === value, graded)}`}
                    >
                      {value ? "O" : "X"}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {currentQuestion.type === "essay" &&
        (!revealed ? (
          <p className="rounded-card border border-dashed border-border px-4 py-5 text-center text-sm text-muted">
            답을 떠올려 본 뒤, 정답을 확인하고 스스로 채점해 보세요.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 rounded-card border border-border p-4">
              <span className="text-[13px] font-bold text-muted">모범답안</span>
              {currentQuestion.answerText && (
                // editable as soon as the answer is revealed — no need to
                // self-grade first just to find the highlight tools
                <HighlightableText
                  text={currentQuestion.answerText}
                  ranges={textRanges}
                  editable
                  onAddAnnotation={handleAddTextAnnotation}
                  onClearAll={handleClearTextAnnotations}
                />
              )}
              {currentQuestion.answerImages.map((image, index) => (
                <BlobImage
                  key={index}
                  blob={image}
                  alt={`정답 사진 ${index + 1}`}
                  className="max-h-72 w-full rounded-control border border-border bg-surface-sunken object-contain"
                />
              ))}
            </div>
            {!graded && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={grading}
                  onClick={() => finalizeGrade(true)}
                  className="h-14 rounded-[18px] border border-correct bg-correct-soft text-base font-bold text-correct disabled:opacity-60"
                >
                  맞았어요
                </button>
                <button
                  type="button"
                  disabled={grading}
                  onClick={() => finalizeGrade(false)}
                  className="h-14 rounded-[18px] border border-wrong bg-wrong-soft text-base font-bold text-wrong disabled:opacity-60"
                >
                  틀렸어요
                </button>
              </div>
            )}
          </div>
        ))}

      {graded && wasCorrect !== null && (
        <div
          role="status"
          className={`flex items-center gap-3 rounded-card p-4 ${
            wasCorrect ? "bg-correct-soft" : "bg-wrong-soft"
          }`}
        >
          <span
            aria-hidden="true"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-surface ${
              wasCorrect ? "bg-correct" : "bg-wrong"
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            >
              {wasCorrect ? <circle cx="12" cy="12" r="7" /> : <path d="M6 6l12 12M18 6L6 18" />}
            </svg>
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className={`text-base font-extrabold ${wasCorrect ? "text-correct" : "text-wrong"}`}>
              {wasCorrect ? "맞았어요" : "틀렸어요"}
            </p>
            <p className="text-[13px] text-ink/70">
              {wasCorrect ? "다음 복습에서는 빠져요" : referenceAnswerText(currentQuestion)}
            </p>
          </div>
        </div>
      )}

      {currentQuestion.explanation?.trim() &&
        (currentQuestion.type === "essay" ? revealed : graded) && (
          <div className="flex flex-col gap-1.5 rounded-card bg-bg p-4">
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-brand">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
              </svg>
              해설
            </span>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {currentQuestion.explanation}
            </p>
          </div>
        )}

      <div className="mt-auto flex flex-col gap-2 pt-2">
        {currentQuestion.type === "ox" && oxItems.length > 1 && !graded && (
          <span className="text-center text-[13px] text-muted">
            {answeredOxCount} / {oxItems.length} 항목 선택함
          </span>
        )}
        {currentQuestion.type === "essay" && !revealed && (
          <button type="button" onClick={() => setRevealed(true)} className={PRIMARY_BUTTON}>
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
              (currentQuestion.type === "ox" && !allOxAnswered)
            }
            className={PRIMARY_BUTTON}
          >
            채점하기
          </button>
        )}
        {graded && (
          <button type="button" onClick={handleNext} className={PRIMARY_BUTTON}>
            {isLast ? "결과 보기" : "다음 문제"}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        )}
      </div>
    </SolveFrame>
  );
}
