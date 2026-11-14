# Review Note — 프로젝트 지침

개인 오답노트 웹앱. 사용자가 **아카이브(노트)** 를 만들고, 문제를 사진/OCR/직접작성으로 넣고,
다시 풀며 맞힌 문제는 다음 풀이에서 자동으로 빠지는 복습 도구.

---

## ver.0 범위 (지금 만드는 것)

- **로컬 전용**: 백엔드·서버·로그인 없음. 모든 데이터는 브라우저(IndexedDB)에 저장.
- Vercel **정적 배포**.
- 향후(ver.1): 백엔드 + MongoDB + 로그인 + 클라우드 이미지/OCR. 지금은 그 경계를 `api/` 계층으로 격리해 둔다.

### 하지 말 것 (ver.0)

- 백엔드/서버/외부 API 호출 추가 금지.
- 로그인/회원 로직 구현 금지 (ver.1).
- 이미지를 localStorage/sessionStorage에 저장 금지 → 반드시 Dexie 사용.

---

## 기술 스택

- Vite + React + **TypeScript** (스캐폴드 완료)
- 라우팅: `react-router`
- 상태: **Zustand** — UI·세션 상태만. 영속화 아님(영속은 Dexie 담당).
- 로컬 영속: **Dexie (IndexedDB)** — 아카이브/문제/이미지의 source of truth.
- OCR: **Tesseract.js** (`kor+eng`), 클라이언트 실행. 인식 결과는 편집 가능한 텍스트로 채워 사용자가 손봄.
  - 인식 전 전처리(`util/prepareOcrImage` → `util/enhanceForOcr`): 흑백 → 조명 평탄화(그림자 제거) → 대비 확장.
    Tesseract는 전역 임계값 하나로 이진화하므로 그림자 진 쪽 글자가 통째로 사라짐 — 평탄화가 핵심.
  - 확대(upscale)는 효과가 일정하지 않아 쓰지 않음. 설정: `PSM.SINGLE_BLOCK`, `preserve_interword_spaces=1`.
- 하이라이팅: 텍스트만(문자 offset 기반). **사진 위 주석(SVG 캔버스)은 시도 후 제거함** — 다시 넣지 말 것.
- 테스트: **vitest** (`npm test`). 순수 로직(`util/`)만 단위 테스트.
- 스타일: **Tailwind CSS v4** + 아래 디자인 토큰(CSS 변수).
- 폰트: **Pretendard** (CDN), `system-ui` fallback.

---

## 폴더 구조 (역할 기반 · 한 파일 = 한 컴포넌트/기능)

```
src/
  api/         # 데이터 접근 경계. ver.0엔 Dexie 래핑. ver.1에 HTTP로 교체해도 컴포넌트는 안 건드림.
  db/          # Dexie 스키마 정의 (api/가 이걸 사용)
  pages/       # 라우트 화면 1개 = 1파일
  components/  # 재사용 UI
  store/       # zustand 스토어
  types/       # 도메인 타입 (Archive, Question, Annotation ...)
  constants/   # 상수 (문제 유형, 색상 키 등)
  util/        # 순수 함수 (OCR 후처리, 채점 로직 등)
```

## 코딩 규칙

- 한 파일에 하나의 컴포넌트/함수. 파일명 = 대상명.
- 자동 등록·추상화 마법 금지. 화면·분기는 **명시적으로** (문제 유형 분기는 `switch`/`if`로).
- 타입은 `types/`에 모아 명시. `any` 금지.
- 데이터 접근은 **반드시 `api/` 경유**. 컴포넌트가 Dexie 직접 호출 금지.
- 부수효과 없는 로직(채점·OCR 후처리)은 `util/`로 분리.

---

## 도메인 데이터 모델

```ts
// types/domain.ts
export type QuestionType = "mcq" | "essay" | "ox";
export type Status = "unsolved" | "correct" | "wrong";

export interface Archive {
  id: string;
  name: string;
  createdAt: number;
}

export type Annotation =
  | {
      target: "text";
      field: "answerText";
      start: number;
      end: number; // 문자 offset
      style: "highlight" | "underline";
    }
  | {
      target: "image";
      field: "promptImage" | "answerImage";
      paths: { d: string; style: "highlight" | "underline" }[];
    }; // SVG path — ver.0에선 미사용(사진 주석 제거됨)

export interface OxItem {
  statement: string; // 항목 지문 (사진 문제면 비워둘 수 있음)
  answer: boolean; // 정답 O = true
}

export interface Question {
  id: string;
  archiveId: string;
  type: QuestionType;

  promptText?: string; // 문제(글) — 글/사진 중 하나는 필수
  promptImage?: Blob; // 문제(사진 원본)
  answerText?: string; // 정답(글)
  answerImage?: Blob; // 정답(사진 원본)

  choices?: string[]; // mcq 보기
  correctChoice?: number; // mcq 정답 index
  oxItems?: OxItem[]; // ox 항목들 — 전부 맞아야 정답

  annotations: Annotation[];
  status: Status;
  lastResult?: "correct" | "wrong";
  createdAt: number;
  updatedAt: number;
}
```

이미지는 base64로 부풀리지 말 것. 단, Safari/WebKit의 IndexedDB Blob 저장 버그 때문에
DB 내부에는 `{ buffer: ArrayBuffer, type }`(`StoredImage`)로 저장하고, `api/` 경계에서 `Blob`으로 변환한다.
컴포넌트는 항상 `Blob`만 본다.

스키마 버전: v2에서 `oxAnswer` → `oxItems`(1개 항목) 마이그레이션. 스키마를 바꾸면 `db/schema.ts`에 새 버전 + upgrade를 추가할 것.

---

## 채점 규칙

- **객관식(mcq)**: 선택 index == `correctChoice` → 자동 채점.
- **OX**: 항목마다 O/X 선택 → **모든 항목**이 `answer`와 같아야 맞음. 하나라도 틀리면 문제 전체가 틀림.
- **서술형(essay)**: 자동 채점 불가 → 정답을 보여주고 사용자가 **스스로 O/X**(self-grading).
  하이라이팅(형광펜/밑줄)은 정답을 펼친 순간부터 채점 결과와 무관하게 가능, "전체 지우기" 제공.
- 맞음 → `status = 'correct'` → 다음 풀이 세션에서 기본 제외.
- 틀림 → `status = 'wrong'` → 계속 등장.

---

## 디자인 시스템 (인디고 중심 · 모던 · 심플)

**컨셉:** 차분한 인디고/잉크 베이스 위에, **채점 마크(O/X)와 형광펜만** 색으로 튄다.
"종이 오답노트의 교정 흔적"이 시그니처. 형광펜 노랑이 유일한 따뜻한 포인트 — 여기에만 대담함을 쓰고 나머지는 조용히.

### 색상 토큰 (CSS 변수 / Tailwind @theme)

```
--ink:            #1E1B4B   /* 기본 텍스트 (인디고 딥) */
--primary:        #4F46E5   /* 주요 액션 */
--primary-hover:  #4338CA
--bg:             #F7F7FC   /* 살짝 인디고 틴트 배경 */
--surface:        #FFFFFF   /* 카드 */
--border:         #E5E7F0
--muted:          #6B7280   /* 보조 텍스트 */
--correct:        #059669   /* O, 맞음 */
--wrong:          #E11D48   /* X, 틀림 */
--highlighter:    #FDE68A   /* 형광펜 (유일한 따뜻한 포인트) */
--underline:      #E11D48   /* 밑줄 */
```

### 스타일 규칙

- 반경: 카드·버튼 12px, 작은 요소 8px.
- 여백 넉넉히. 그림자는 옅게 최소한만.
- 다크 모드: `prefers-color-scheme` 기본 + 헤더 토글(`store/themeStore`, `data-theme` 속성). 형광펜은 두 모드 모두 노랑이므로 그 위 글자색은 잉크로 고정.
- 폰트: Pretendard. 위계 — 화면 제목 20–24 semibold / 본문 15–16 regular / 캡션 13 muted.
- 문구: 능동태·문장형·사용자 언어. 버튼은 동작 그대로("저장", "채점하기"). 빈 화면은 행동 유도("첫 아카이브를 만들어 보세요").
- 품질 바닥선: **모바일 반응형**(사진 촬영이 모바일 주 사용처), 키보드 포커스 보임, `prefers-reduced-motion` 존중.

---

## 화면 (ver.0)

1. **홈** — 아카이브 목록 + 새 아카이브 만들기.
2. **아카이브 상세** — 문제 목록 + 진행 현황(전체 / 남은 / 맞힘) + 문제 추가.
3. **문제 추가·편집** — 유형 선택(객관식/서술형/OX) → 문제 입력(촬영·갤러리·OCR·직접, 글/사진 중 하나 필수) → 정답 입력.
   OX는 항목 추가/삭제 가능(항목 = 문장(선택) + O/X).
4. **풀이 세션** — 기본은 `correct` 아닌 문제만 순회. 답 제출 → 채점 → 맞음 O(제외) / 틀림 X + 하이라이팅. "전체 보기" 토글로 맞힌 문제도 포함 가능.

---

## 빌드 순서 (Plan mode에서 이 순서로)

- **Phase 1** — 기반: 타입 + Dexie 스키마 + `api/` 계층 + 디자인 토큰/전역 스타일 + 라우팅 뼈대.
- **Phase 2** — 홈(아카이브 CRUD) + 아카이브 상세(문제 목록).
- **Phase 3** — 문제 추가·편집: 직접작성 → 사진 업로드 → OCR(Tesseract) 순으로.
- **Phase 4** — 풀이 세션 + 자동 채점(객관식/OX) + self-grading(서술형).
- **Phase 5** — 하이라이팅: 텍스트(offset 기반). ~~사진 캔버스(SVG)~~ — 사용성 문제로 제거.
- **Phase 6** — 진행 현황 + 다듬기 + Vercel 배포.

한 Phase 끝날 때마다 커밋하고 사람이 리뷰한다. 다음 Phase로 임의 진행 금지.

**현재 상태:** Phase 1–6 완료, https://review-note.vercel.app 배포(main push 시 자동 배포).
이후 추가: 사진만으로 문제 등록, OCR 전처리, OX 다항목.
