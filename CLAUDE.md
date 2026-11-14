# Review Note — 프로젝트 지침

개인 오답노트 웹앱. 사용자가 **아카이브(노트)** 를 만들고, 문제를 사진/OCR/직접작성으로 넣고,
다시 풀며 맞힌 문제는 다음 풀이에서 자동으로 빠지는 복습 도구.

---

## ver.0 범위 (완료)

- **로컬 전용**: 백엔드·서버·로그인 없음. 모든 데이터는 브라우저(IndexedDB)에 저장.
- Vercel **정적 배포**.
- 향후(ver.1): 백엔드 + MongoDB + 로그인 + 클라우드 이미지/OCR. 지금은 그 경계를 `api/` 계층으로 격리해 둔다.
  - **OCR은 네이버 CLOVA OCR로 확정** (Tesseract는 실사용에서 한글 인식이 부족함). Secret Key는 서버에만 두고 클라이언트 번들에 절대 넣지 말 것.
    `util/ocr.ts`의 `recognizeText(image, onProgress)` 시그니처는 유지해 호출부(ImageCaptureInput)는 안 바꾼다.

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

export type Annotation = {
  target: "text";
  field: "answerText";
  start: number;
  end: number; // 문자 offset
  style: "highlight" | "underline";
};

export interface OxItem {
  statement: string; // 항목 지문 (사진 문제면 비워둘 수 있음)
  answer: boolean; // 정답 O = true
}

export interface Question {
  id: string;
  archiveId: string;
  type: QuestionType;

  promptText?: string; // 문제(글) — 글/사진 중 하나는 필수
  promptImages: Blob[]; // 문제(사진 원본, 최대 10장)
  answerText?: string; // 정답(글)
  answerImages: Blob[]; // 정답(사진 원본, 최대 10장)

  choices?: string[]; // mcq 보기
  correctChoice?: number; // mcq 정답 index
  oxItems?: OxItem[]; // ox 항목들 — 전부 맞아야 정답
  explanation?: string; // 해설 (선택, 모든 유형) — 채점 후(서술형은 정답 펼친 후) 표시

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

스키마 버전: v2 `oxAnswer` → `oxItems`(1개 항목), v3 `promptImage`/`answerImage` → `promptImages`/`answerImages`(배열) + 사진 주석 제거. 스키마를 바꾸면 `db/schema.ts`에 새 버전 + upgrade를 추가할 것.

---

## 채점 규칙

- **객관식(mcq)**: 선택 index == `correctChoice` → 자동 채점.
- **OX**: 항목마다 O/X 선택 → **모든 항목**이 `answer`와 같아야 맞음. 하나라도 틀리면 문제 전체가 틀림.
- **서술형(essay)**: 자동 채점 불가 → 정답을 보여주고 사용자가 **스스로 O/X**(self-grading).
  하이라이팅(형광펜/밑줄)은 정답을 펼친 순간부터 채점 결과와 무관하게 가능, "전체 지우기" 제공.
- 맞음 → `status = 'correct'` → 다음 풀이 세션에서 기본 제외.
- 틀림 → `status = 'wrong'` → 계속 등장.

---

## 디자인 시스템 (Soft Indigo · 모던 · 심플)

**컨셉:** 진한 인디고를 주인공으로, 연한 회보라 배경 위에 크게 둥근 흰 카드와 넉넉한 여백.
풀이 화면은 인디고 배경 위로 흰 시트가 올라오는 구조. 색은 **채점(O/X)과 형광펜**에만 쓴다 — 형광펜 노랑이 유일한 따뜻한 포인트.
시안: https://claude.ai/artifact/4Sdrrji9vt41aepRBAshuk (로그인 화면 포함)

### 색상 토큰 (`src/index.css`, CSS 변수 → Tailwind @theme)

```
--ink #17153B        기본 텍스트          --muted #6B6A85     보조 텍스트
--bg #F4F4FA         배경                 --surface #FFFFFF   카드
--surface-sunken     입력칸 배경          --border #E7E7F1
--primary #3B36DB    버튼 채움(흰 글자)    --brand             표면 위 인디고 글자·아이콘
--primary-soft       연한 인디고 배경      --hero              풀이 화면·홈 히어로 카드 배경
--correct / -soft    O, 맞음               --wrong / -soft     X, 틀림
--amber / --teal / --neutral (+ -soft)    유형·상태 태그 (OX / 서술형 / 안 풀었어요)
--highlighter #FDE68A 형광펜               --underline         밑줄
```

다크 모드는 같은 이름에 값만 바꾼다. `--primary`(채움)와 `--brand`(글자)는 다크에서 값이 다르다 — 글자로 읽힐 만큼 밝은 인디고는 흰 글자를 올리면 대비가 부족하기 때문.

### 스타일 규칙

- 반경: 카드 20px(`rounded-card`), 버튼·입력 14px(`rounded-control`), 시트 32px(`rounded-t-sheet`), 칩·필터는 pill.
- 주요 버튼 높이 56px, 터치 영역 최소 44px. 그림자는 `shadow-card`(옅게)·`shadow-primary`(주요 버튼)만, 다크에선 없음.
- 다크 모드: `prefers-color-scheme` 기본 + 헤더 토글(`store/themeStore`, `data-theme` 속성). 형광펜 위 글자색은 잉크로 고정.
- 폰트: Pretendard. 위계 — 큰 제목 26 extrabold / 화면 제목 20 extrabold / 본문 15–16 / 캡션 12–13 muted.
- 문구: 능동태·문장형·사용자 언어. 버튼은 동작 그대로("저장", "채점하기"). 상태는 **맞힘/틀림/남은/안 풀었어요**로만 쓴다(“졸업” 같은 비유 금지). 화면에서는 "아카이브" 대신 **"노트"**.
- 빈 화면은 행동 유도("첫 노트를 만들어 보세요"). 확인·입력은 `BottomSheet`(네이티브 `<dialog>`).
- 품질 바닥선: **모바일 우선**(앱 폭 최대 560px로 가운데 정렬), 키보드 포커스 보임, `prefers-reduced-motion` 존중.

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
이후 추가: 사진만으로 문제 등록, OCR 전처리, OX 다항목, 문제·정답 사진 여러 장, 해설(선택).

---

## ver.1 계획 (확정된 설계 · 아직 구현 안 함)

원칙: **최대한 단순하게, 전부 무료.** 서비스는 Vercel · MongoDB Atlas · 카카오 · CLOVA 4개만.

```
[브라우저 React 앱] ── src/api/* (fetch로 교체, 화면 코드는 그대로)
        ▼
[Vercel 한 프로젝트]
  ├─ 정적 프론트 (지금과 동일)
  └─ /api/*  서버리스 함수 1개 (Hono 라우팅)
       ├─ 로그인 ────▶ 카카오 OAuth (REST API, SDK 없이)
       ├─ 데이터/사진 ─▶ MongoDB Atlas M0 (512MB)
       └─ OCR ──────▶ 네이버 CLOVA OCR (월 1000건 무료)
```

### 확정 사항

- **로그인: 카카오만. 로그인 필수**(비로그인 사용 없음).
  흐름: `/api/auth/kakao` → 카카오 인가 → `/api/auth/kakao/callback`에서 code→토큰 교환 →
  `/v2/user/me`로 카카오 id·닉네임 조회 → `users` upsert → 서명된 세션 쿠키(httpOnly, Secure, SameSite=Lax) 발급.
  이메일은 비즈 앱 심사가 필요하니 받지 않는다(카카오 id + 닉네임만).
- **오프라인 미지원.** 서버(Atlas)가 유일한 source of truth. 브라우저 사본·동기화 없음.
- **사진도 Atlas에 바이너리로 저장**(`images` 컬렉션), `/api/images/:id`로 본인 것만 제공. 가득 차면 그때 R2로 이전.
  문제당 사진이 여러 장이므로 **사진은 1장씩 따로 업로드**(4.5MB 요청 제한) → 문제 문서엔 이미지 id 배열만 저장.
- **OCR은 CLOVA.** Secret Key는 서버 환경변수에만. `util/ocr.ts`의 `recognizeText(image, onProgress)` 시그니처 유지.
  로그인 사용자만 호출 가능, `ocrUsage`로 월 건수를 세서 **900건에서 차단**(초과 시 과금되므로) → "직접 입력해 주세요" 안내.
- **기존 로컬 데이터 이전:** 첫 로그인 시 IndexedDB에 데이터가 있으면 "이 기기의 문제 N개를 계정으로 옮길까요?" 1회 제안.
  이전 기능 때문에 Dexie는 그 용도로만 남긴다.

### 무료 한도 · 제약 (지킬 것)

- Vercel Hobby: 요청 본문 **4.5MB** 제한(사진은 업로드 전 1600px JPEG로 리사이즈 유지), 함수 개수 제한 → **catch-all 함수 1개 + Hono**. 비상업 용도만.
- Atlas M0: 512MB. 네트워크 접근은 `0.0.0.0/0`(Vercel IP가 고정 아님) → 접속 정보는 환경변수로만.
- 서버리스에서 Mongo 연결은 모듈 스코프에 캐싱해 재사용.
- 모든 문서에 `userId`를 두고, **모든 조회·수정은 세션의 userId로 필터**(남의 데이터 접근 차단).

### API (초안)

```
GET    /api/auth/kakao                  카카오 인가 페이지로 리다이렉트
GET    /api/auth/kakao/callback         토큰 교환 → 세션 쿠키 → 앱으로 리다이렉트
POST   /api/auth/logout
GET    /api/me
GET    /api/archives                    POST   /api/archives
PATCH  /api/archives/:id                DELETE /api/archives/:id
GET    /api/archives/:id/questions      POST   /api/archives/:id/questions
PATCH  /api/questions/:id               DELETE /api/questions/:id
GET    /api/images/:id
POST   /api/ocr
```

컬렉션: `users`, `archives`, `questions`, `images`, `ocrUsage`.

### 환경변수 (Vercel에만, 저장소 커밋 금지)

`MONGODB_URI`, `SESSION_SECRET`, `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`, `KAKAO_REDIRECT_URI`,
`CLOVA_OCR_INVOKE_URL`, `CLOVA_OCR_SECRET`. 로컬은 `.env.local`(gitignore의 `*.local`로 이미 제외됨).

### 빌드 순서 (ver.1)

- **Phase 7** — 서버 기반: `/api` catch-all + Hono, Atlas 연결, 환경변수, 헬스체크, 로컬 개발(`vercel dev`).
- **Phase 8** — 카카오 로그인 + 세션 쿠키 + 로그인 필수 라우트 가드 + 로그아웃.
- **Phase 9** — 아카이브·문제·사진 API → `src/api/*`를 fetch로 교체.
- **Phase 10** — CLOVA OCR 프록시 + 월 900건 한도.
- **Phase 11** — 로컬 데이터 이전 + 다듬기 + 배포.

ver.0과 같이 Phase마다 커밋하고 사람이 리뷰. 착수는 ver.0 사용자 피드백 반영 후.

### 착수 전 사용자가 준비할 것

- 카카오 개발자 콘솔: 앱 생성, 카카오 로그인 활성화, Redirect URI 등록
  (`https://review-note.vercel.app/api/auth/kakao/callback`, 로컬 `http://localhost:3000/api/auth/kakao/callback`), 동의항목 닉네임, Client Secret 발급.
- MongoDB Atlas: M0 클러스터 생성, DB 유저, 네트워크 `0.0.0.0/0`.
- 네이버 클라우드: CLOVA OCR 도메인 생성(General), APIGW Invoke URL + Secret Key 발급. 무료 건수·과금 조건 콘솔에서 재확인.
