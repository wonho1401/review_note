import { useEffect, useState, type SubmitEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { createQuestion, getQuestion, updateQuestion } from "@/api/question";
import { QUESTION_TYPE_LABEL } from "@/constants/questionType";
import ImageCaptureInput from "@/components/ImageCaptureInput";
import PageHeader from "@/components/PageHeader";
import SegmentedControl from "@/components/SegmentedControl";
import type { Question, QuestionType } from "@/types/domain";

export default function QuestionEditPage() {
  const { archiveId, questionId } = useParams();
  const navigate = useNavigate();

  const [loadedQuestion, setLoadedQuestion] = useState<Question | null | undefined>(
    questionId ? undefined : null,
  );
  const [type, setType] = useState<QuestionType | null>(null);
  const [promptText, setPromptText] = useState("");
  const [promptImage, setPromptImage] = useState<Blob | undefined>(undefined);
  const [choices, setChoices] = useState<string[]>(["", ""]);
  const [correctChoice, setCorrectChoice] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [answerImage, setAnswerImage] = useState<Blob | undefined>(undefined);
  const [oxAnswer, setOxAnswer] = useState<boolean | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!questionId) return;
    let cancelled = false;
    getQuestion(questionId).then((q) => {
      if (cancelled) return;
      setLoadedQuestion(q ?? null);
      if (!q) return;
      setType(q.type);
      setPromptText(q.promptText ?? "");
      setPromptImage(q.promptImage);
      if (q.type === "mcq") {
        setChoices(q.choices && q.choices.length >= 2 ? q.choices : ["", ""]);
        setCorrectChoice(q.correctChoice ?? null);
      } else if (q.type === "essay") {
        setAnswerText(q.answerText ?? "");
        setAnswerImage(q.answerImage);
      } else if (q.type === "ox") {
        setOxAnswer(q.oxAnswer ?? null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [questionId]);

  function handleChoiceChange(index: number, value: string) {
    setChoices((prev) => prev.map((c, i) => (i === index ? value : c)));
  }

  function handleRemoveChoice(index: number) {
    if (choices.length <= 2) return;
    setChoices((prev) => prev.filter((_, i) => i !== index));
    setCorrectChoice((prev) => {
      if (prev === null || prev === index) return null;
      return prev > index ? prev - 1 : prev;
    });
  }

  function applyRecognizedText(
    recognized: string,
    current: string,
    setter: (value: string) => void,
  ) {
    if (!current.trim()) {
      setter(recognized);
      return;
    }
    if (window.confirm("인식된 텍스트로 기존 입력을 덮어쓸까요?")) {
      setter(recognized);
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!promptText.trim() && !promptImage) {
      setFormError("문제 내용을 입력하거나 사진을 넣어 주세요");
      return;
    }
    if (type === null) {
      setFormError("문제 유형을 선택해 주세요");
      return;
    }
    switch (type) {
      case "mcq":
        if (choices.length < 2) {
          setFormError("보기를 2개 이상 입력해 주세요");
          return;
        }
        if (choices.some((c) => !c.trim())) {
          setFormError("빈 보기를 채우거나 삭제해 주세요");
          return;
        }
        if (correctChoice === null) {
          setFormError("정답 보기를 선택해 주세요");
          return;
        }
        break;
      case "essay":
        if (!answerText.trim()) {
          setFormError("모범답안을 입력해 주세요");
          return;
        }
        break;
      case "ox":
        if (oxAnswer === null) {
          setFormError("정답(O/X)을 선택해 주세요");
          return;
        }
        break;
    }
    setFormError(null);

    if (!archiveId) return;

    setSaving(true);
    try {
      if (questionId) {
        switch (type) {
          case "mcq":
            await updateQuestion(questionId, {
              promptText: promptText.trim(),
              promptImage,
              choices: choices.map((c) => c.trim()),
              correctChoice: correctChoice as number,
            });
            break;
          case "essay":
            await updateQuestion(questionId, {
              promptText: promptText.trim(),
              promptImage,
              answerText: answerText.trim(),
              answerImage,
            });
            break;
          case "ox":
            await updateQuestion(questionId, {
              promptText: promptText.trim(),
              promptImage,
              oxAnswer: oxAnswer as boolean,
            });
            break;
        }
      } else {
        switch (type) {
          case "mcq":
            await createQuestion({
              archiveId,
              type: "mcq",
              promptText: promptText.trim(),
              promptImage,
              choices: choices.map((c) => c.trim()),
              correctChoice: correctChoice as number,
            });
            break;
          case "essay":
            await createQuestion({
              archiveId,
              type: "essay",
              promptText: promptText.trim(),
              promptImage,
              answerText: answerText.trim(),
              answerImage,
            });
            break;
          case "ox":
            await createQuestion({
              archiveId,
              type: "ox",
              promptText: promptText.trim(),
              promptImage,
              oxAnswer: oxAnswer as boolean,
            });
            break;
        }
      }
      navigate(`/archives/${archiveId}`);
    } finally {
      setSaving(false);
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

  if (questionId && loadedQuestion === undefined) {
    return (
      <main className="p-6">
        <p className="text-sm text-muted">불러오는 중…</p>
      </main>
    );
  }

  if (questionId && loadedQuestion === null) {
    return (
      <main>
        <PageHeader backTo={`/archives/${archiveId}`} title="문제를 찾을 수 없습니다" />
      </main>
    );
  }

  return (
    <main>
      <PageHeader
        backTo={`/archives/${archiveId}`}
        title={questionId ? "문제 편집" : "문제 추가"}
      />
      <div className="p-6">
        <form onSubmit={handleSubmit}>
          <section>
            <h2 className="text-base font-semibold text-ink">유형 선택</h2>
            {questionId ? (
              <>
                <span className="mt-2 inline-flex items-center rounded-full border border-border bg-bg px-3 py-1 text-sm font-medium text-ink">
                  {type ? QUESTION_TYPE_LABEL[type] : ""}
                </span>
                <p className="mt-1 text-xs text-muted">
                  만든 뒤에는 문제 유형을 바꿀 수 없어요.
                </p>
              </>
            ) : (
              <div className="mt-2">
                <SegmentedControl
                  options={(["mcq", "essay", "ox"] as const).map((t) => ({
                    value: t,
                    label: QUESTION_TYPE_LABEL[t],
                  }))}
                  value={type}
                  onChange={setType}
                />
              </div>
            )}
          </section>

          <section className="mt-6">
            <h2 className="text-base font-semibold text-ink">문제 입력</h2>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="문제 내용을 입력하세요 (사진만 넣어도 돼요)"
              rows={4}
              className="mt-2 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted"
            />
            <ImageCaptureInput
              image={promptImage}
              onImageChange={setPromptImage}
              onTextRecognized={(text) => applyRecognizedText(text, promptText, setPromptText)}
              label="문제 사진"
            />
          </section>

          <section className="mt-6">
            <h2 className="text-base font-semibold text-ink">정답 입력</h2>
            {type === null && (
              <p className="mt-2 text-sm text-muted">문제 유형을 먼저 선택해 주세요.</p>
            )}

            {type === "mcq" && (
              <div className="mt-2 flex flex-col gap-2">
                {choices.map((choice, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctChoice"
                      checked={correctChoice === index}
                      onChange={() => setCorrectChoice(index)}
                      aria-label={`보기 ${index + 1}번을 정답으로 표시`}
                      className="h-4 w-4 accent-primary"
                    />
                    <input
                      value={choice}
                      onChange={(e) => handleChoiceChange(index, e.target.value)}
                      placeholder={`보기 ${index + 1}`}
                      className="min-w-0 flex-1 rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted"
                    />
                    {choices.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveChoice(index)}
                        className="shrink-0 whitespace-nowrap rounded-control px-2 py-1 text-xs text-wrong hover:underline"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setChoices((prev) => [...prev, ""])}
                  className="mt-1 self-start rounded-control border border-border px-3 py-1.5 text-xs text-primary hover:border-primary"
                >
                  보기 추가
                </button>
              </div>
            )}

            {type === "essay" && (
              <>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="모범답안을 입력하세요"
                  rows={4}
                  className="mt-2 w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted"
                />
                <ImageCaptureInput
                  image={answerImage}
                  onImageChange={setAnswerImage}
                  onTextRecognized={(text) => applyRecognizedText(text, answerText, setAnswerText)}
                  label="정답 사진"
                />
              </>
            )}

            {type === "ox" && (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setOxAnswer(true)}
                  className={`flex-1 rounded-control border px-4 py-2 text-sm font-medium ${
                    oxAnswer === true
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-surface text-ink"
                  }`}
                >
                  O
                </button>
                <button
                  type="button"
                  onClick={() => setOxAnswer(false)}
                  className={`flex-1 rounded-control border px-4 py-2 text-sm font-medium ${
                    oxAnswer === false
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-surface text-ink"
                  }`}
                >
                  X
                </button>
              </div>
            )}
          </section>

          {formError && <p className="mt-4 text-sm text-wrong">{formError}</p>}

          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {saving ? "저장하는 중…" : "문제 저장"}
            </button>
            <Link to={`/archives/${archiveId}`} className="text-sm text-muted hover:text-ink">
              취소
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
