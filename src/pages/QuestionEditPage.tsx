import { useEffect, useState, type SubmitEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { createQuestion, getQuestion, updateQuestion } from "@/api/question";
import { QUESTION_TYPE_LABEL } from "@/constants/questionType";
import ImageCaptureInput from "@/components/ImageCaptureInput";
import PageHeader from "@/components/PageHeader";
import RemoveButton from "@/components/RemoveButton";
import SegmentedControl from "@/components/SegmentedControl";
import type { Question, QuestionType } from "@/types/domain";

// Editing state for one OX item: the answer stays null until the user picks it.
interface OxItemDraft {
  statement: string;
  answer: boolean | null;
}

const EMPTY_OX_ITEM: OxItemDraft = { statement: "", answer: null };

const CARD = "flex flex-col gap-3 rounded-[22px] bg-surface p-4 shadow-card";
const FIELD =
  "w-full rounded-control border border-border bg-surface-sunken px-3 py-2.5 text-[15px] text-ink placeholder:text-muted";
const ADD_ROW =
  "h-10 rounded-[12px] border-[1.5px] border-dashed border-border bg-surface text-[13px] font-bold text-brand hover:border-brand";

export default function QuestionEditPage() {
  const { archiveId, questionId } = useParams();
  const navigate = useNavigate();

  const [loadedQuestion, setLoadedQuestion] = useState<Question | null | undefined>(
    questionId ? undefined : null,
  );
  const [type, setType] = useState<QuestionType | null>(null);
  const [promptText, setPromptText] = useState("");
  const [promptImages, setPromptImages] = useState<Blob[]>([]);
  const [choices, setChoices] = useState<string[]>(["", ""]);
  const [correctChoice, setCorrectChoice] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [answerImages, setAnswerImages] = useState<Blob[]>([]);
  const [oxItems, setOxItems] = useState<OxItemDraft[]>([EMPTY_OX_ITEM]);
  const [explanation, setExplanation] = useState("");
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
      setPromptImages(q.promptImages);
      setExplanation(q.explanation ?? "");
      if (q.type === "mcq") {
        setChoices(q.choices && q.choices.length >= 2 ? q.choices : ["", ""]);
        setCorrectChoice(q.correctChoice ?? null);
      } else if (q.type === "essay") {
        setAnswerText(q.answerText ?? "");
        setAnswerImages(q.answerImages);
      } else if (q.type === "ox") {
        setOxItems(q.oxItems && q.oxItems.length > 0 ? q.oxItems : [EMPTY_OX_ITEM]);
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

  function handleOxItemChange(index: number, changes: Partial<OxItemDraft>) {
    setOxItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  }

  function handleRemoveOxItem(index: number) {
    if (oxItems.length <= 1) return;
    setOxItems((prev) => prev.filter((_, i) => i !== index));
  }

  function applyRecognizedText(
    recognized: string,
    current: string,
    setter: (value: string) => void,
  ) {
    // With several photos, each recognition adds its part instead of
    // replacing what earlier photos produced.
    setter(current.trim() ? `${current.trimEnd()}\n\n${recognized}` : recognized);
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!promptText.trim() && promptImages.length === 0) {
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
        if (oxItems.some((item) => item.answer === null)) {
          setFormError("모든 항목의 정답(O/X)을 선택해 주세요");
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
              promptImages,
              explanation: explanation.trim(),
              choices: choices.map((c) => c.trim()),
              correctChoice: correctChoice as number,
            });
            break;
          case "essay":
            await updateQuestion(questionId, {
              promptText: promptText.trim(),
              promptImages,
              explanation: explanation.trim(),
              answerText: answerText.trim(),
              answerImages,
            });
            break;
          case "ox":
            await updateQuestion(questionId, {
              promptText: promptText.trim(),
              promptImages,
              explanation: explanation.trim(),
              oxItems: oxItems.map((item) => ({
                statement: item.statement.trim(),
                answer: item.answer as boolean,
              })),
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
              promptImages,
              answerImages: [],
              explanation: explanation.trim(),
              choices: choices.map((c) => c.trim()),
              correctChoice: correctChoice as number,
            });
            break;
          case "essay":
            await createQuestion({
              archiveId,
              type: "essay",
              promptText: promptText.trim(),
              promptImages,
              explanation: explanation.trim(),
              answerText: answerText.trim(),
              answerImages,
            });
            break;
          case "ox":
            await createQuestion({
              archiveId,
              type: "ox",
              promptText: promptText.trim(),
              promptImages,
              answerImages: [],
              explanation: explanation.trim(),
              oxItems: oxItems.map((item) => ({
                statement: item.statement.trim(),
                answer: item.answer as boolean,
              })),
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
      <main>
        <PageHeader backTo="/" title="잘못된 주소예요" />
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
        <PageHeader backTo={`/archives/${archiveId}`} title="문제를 찾을 수 없어요" />
      </main>
    );
  }

  return (
    <main>
      <PageHeader
        backTo={`/archives/${archiveId}`}
        title={questionId ? "문제 편집" : "문제 추가"}
      />
      <form onSubmit={handleSubmit} className="flex min-h-[calc(100svh-4.75rem)] flex-col">
        <div className="flex flex-1 flex-col gap-3.5 px-5 pb-6 pt-2">
          {questionId ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <span className="rounded-lg bg-primary-soft px-2 py-0.5 text-xs font-bold text-brand">
                {type ? QUESTION_TYPE_LABEL[type] : ""}
              </span>
              만든 뒤에는 유형을 바꿀 수 없어요.
            </p>
          ) : (
            <SegmentedControl
              options={(["mcq", "essay", "ox"] as const).map((t) => ({
                value: t,
                label: QUESTION_TYPE_LABEL[t],
              }))}
              value={type}
              onChange={setType}
            />
          )}

          <section className={CARD}>
            <label htmlFor="prompt-text" className="text-sm font-bold text-ink">
              문제
            </label>
            <textarea
              id="prompt-text"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="문제를 입력하거나 사진만 넣어도 돼요"
              rows={3}
              className={FIELD}
            />
            <ImageCaptureInput
              images={promptImages}
              onImagesChange={setPromptImages}
              onTextRecognized={(text) => applyRecognizedText(text, promptText, setPromptText)}
              label="문제 사진"
            />
          </section>

          <section className={CARD}>
            <h2 className="text-sm font-bold text-ink">정답</h2>
            {type === null && <p className="text-sm text-muted">문제 유형을 먼저 골라 주세요.</p>}

            {type === "mcq" && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted">정답인 보기의 동그라미를 눌러 주세요.</p>
                {choices.map((choice, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectChoice(index)}
                      aria-pressed={correctChoice === index}
                      aria-label={`보기 ${index + 1}번을 정답으로 표시`}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                        correctChoice === index
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-surface-sunken text-muted"
                      }`}
                    >
                      {index + 1}
                    </button>
                    <input
                      value={choice}
                      onChange={(e) => handleChoiceChange(index, e.target.value)}
                      placeholder={`보기 ${index + 1}`}
                      aria-label={`보기 ${index + 1} 내용`}
                      className={`${FIELD} h-10 min-w-0 flex-1 py-0`}
                    />
                    {choices.length > 2 && (
                      <RemoveButton
                        label={`보기 ${index + 1} 삭제`}
                        onClick={() => handleRemoveChoice(index)}
                      />
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setChoices((prev) => [...prev, ""])}
                  className={ADD_ROW}
                >
                  + 보기 추가
                </button>
              </div>
            )}

            {type === "essay" && (
              <>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="모범답안을 입력하세요"
                  aria-label="모범답안"
                  rows={4}
                  className={FIELD}
                />
                <ImageCaptureInput
                  images={answerImages}
                  onImagesChange={setAnswerImages}
                  onTextRecognized={(text) => applyRecognizedText(text, answerText, setAnswerText)}
                  label="정답 사진"
                />
              </>
            )}

            {type === "ox" && (
              <div className="flex flex-col gap-2.5">
                {oxItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-4 shrink-0 text-[13px] font-extrabold text-brand">
                      {index + 1}
                    </span>
                    <input
                      value={item.statement}
                      onChange={(e) => handleOxItemChange(index, { statement: e.target.value })}
                      placeholder="항목 내용 (선택)"
                      aria-label={`항목 ${index + 1} 내용`}
                      className={`${FIELD} h-10 min-w-0 flex-1 py-0`}
                    />
                    <div className="flex shrink-0 gap-1">
                      {([true, false] as const).map((value) => (
                        <button
                          key={String(value)}
                          type="button"
                          onClick={() => handleOxItemChange(index, { answer: value })}
                          aria-pressed={item.answer === value}
                          aria-label={`항목 ${index + 1} 정답 ${value ? "O" : "X"}`}
                          className={`h-10 w-10 rounded-[12px] border text-[15px] font-extrabold ${
                            item.answer === value
                              ? "border-primary bg-primary text-white"
                              : "border-border bg-surface-sunken text-ink"
                          }`}
                        >
                          {value ? "O" : "X"}
                        </button>
                      ))}
                    </div>
                    {oxItems.length > 1 && (
                      <RemoveButton
                        label={`항목 ${index + 1} 삭제`}
                        onClick={() => handleRemoveOxItem(index)}
                      />
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setOxItems((prev) => [...prev, EMPTY_OX_ITEM])}
                  className={ADD_ROW}
                >
                  + 항목 추가
                </button>
              </div>
            )}
          </section>

          {type !== null && (
            <section className={CARD}>
              <label htmlFor="explanation" className="text-sm font-bold text-ink">
                해설 <span className="font-normal text-muted">(선택)</span>
              </label>
              <textarea
                id="explanation"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="왜 이게 정답인지, 헷갈렸던 부분을 적어 두세요"
                rows={3}
                className={FIELD}
              />
            </section>
          )}
        </div>

        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-bg px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          {formError && (
            <p role="alert" className="text-sm text-wrong">
              {formError}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="h-14 rounded-[18px] bg-primary text-base font-bold text-white shadow-primary hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? "저장하는 중…" : "저장"}
          </button>
        </div>
      </form>
    </main>
  );
}
